import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseAdminInstance: SupabaseClient | null = null;

const getSupabaseAdmin = () => {
  if (!supabaseAdminInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdminInstance;
};

const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseAdmin() as any)[prop];
  }
});

export interface QueryResult {
  success: boolean;
  data?: any;
  error?: string;
  rowCount?: number;
}

async function executeRawSQL(query: string): Promise<QueryResult> {
  try {
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: query
    });

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        return {
          success: false,
          error: 'Direct SQL execution not configured. Use the helper functions instead.',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data,
      rowCount: Array.isArray(data) ? data.length : 1,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

export async function execute(
  query: string,
  params?: Record<string, any>
): Promise<QueryResult> {
  try {
    const dangerousKeywords = ['DROP TABLE', 'TRUNCATE'];
    const upperQuery = query.toUpperCase();
    const isDangerous = dangerousKeywords.some(keyword => 
      upperQuery.includes(keyword) && !upperQuery.includes('--CONFIRMED')
    );

    if (isDangerous) {
      return {
        success: false,
        error: 'Potentially destructive query detected. Add --CONFIRMED comment to execute.',
      };
    }

    return await executeRawSQL(query);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

export async function executeBatch(
  queries: string[]
): Promise<QueryResult> {
  try {
    if (queries.length === 0) {
      return {
        success: false,
        error: 'No queries provided',
      };
    }

    const dangerousKeywords = ['DROP TABLE', 'TRUNCATE'];
    for (const query of queries) {
      const upperQuery = query.toUpperCase();
      const isDangerous = dangerousKeywords.some(keyword => 
        upperQuery.includes(keyword) && !upperQuery.includes('--CONFIRMED')
      );

      if (isDangerous) {
        return {
          success: false,
          error: 'Potentially destructive query detected in batch. Add --CONFIRMED comment to execute.',
        };
      }
    }

    const results = [];
    
    for (const query of queries) {
      const result = await execute(query);
      if (!result.success) {
        return {
          success: false,
          error: `Batch failed at query: ${query.substring(0, 100)}... Error: ${result.error}`,
        };
      }
      results.push(result.data);
    }

    return {
      success: true,
      data: results,
      rowCount: results.length,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error occurred in batch execution',
    };
  }
}

export async function getTableSchema(tableName: string): Promise<QueryResult> {
  try {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `;
    
    return await executeRawSQL(query);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function listTables(): Promise<QueryResult> {
  try {
    const query = `
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'attendance_%'
      ORDER BY table_name;
    `;
    
    return await executeRawSQL(query);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function getTableRowCount(tableName: string): Promise<QueryResult> {
  try {
    if (!tableName.startsWith('attendance_')) {
      return {
        success: false,
        error: 'Only attendance_ tables are accessible',
      };
    }

    const query = `SELECT COUNT(*) as count FROM ${tableName};`;
    return await executeRawSQL(query);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function selectQuery(
  tableName: string,
  columns: string = '*',
  conditions?: string,
  limit?: number
): Promise<QueryResult> {
  try {
    if (!tableName.startsWith('attendance_')) {
      return {
        success: false,
        error: 'Only attendance_ tables are accessible',
      };
    }

    let query = `SELECT ${columns} FROM ${tableName}`;
    
    if (conditions) {
      query += ` WHERE ${conditions}`;
    }
    
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    
    query += ';';

    return await executeRawSQL(query);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function insertQuery(
  tableName: string,
  data: Record<string, any>
): Promise<QueryResult> {
  try {
    if (!tableName.startsWith('attendance_')) {
      return {
        success: false,
        error: 'Only attendance_ tables are accessible',
      };
    }

    const { data: result, error } = await supabaseAdmin
      .from(tableName)
      .insert(data)
      .select();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: result,
      rowCount: Array.isArray(result) ? result.length : 1,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function updateQuery(
  tableName: string,
  data: Record<string, any>,
  conditions: string
): Promise<QueryResult> {
  try {
    if (!tableName.startsWith('attendance_')) {
      return {
        success: false,
        error: 'Only attendance_ tables are accessible',
      };
    }

    const setClause = Object.entries(data)
      .map(([key, value]) => {
        const val = typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value;
        return `${key} = ${val}`;
      })
      .join(', ');
    
    const query = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE ${conditions}
      RETURNING *;
    `;

    return await executeRawSQL(query);
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

