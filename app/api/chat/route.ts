import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';
import { requireAuth, AuthenticatedRequest } from '@/src/lib/auth';

export const dynamic = 'force-dynamic';
import {
  execute,
  executeBatch,
  getTableSchema,
  listTables,
  getTableRowCount,
  selectQuery,
  insertQuery,
  updateQuery,
} from '@/lib/db-agent-tools';

export const maxDuration = 60;

// Load the comprehensive prompt from file
const SYSTEM_PROMPT = readFileSync(
  join(process.cwd(), 'lib', 'db-agent-prompt.txt'),
  'utf-8'
);

export const POST = requireAuth(['admin'])(async (req: AuthenticatedRequest) => {
  try {
    const { messages } = await req.json();
    
    const result = await streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: SYSTEM_PROMPT,
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(50),
      tools: {
        executeSql: tool({
          description: 'Execute a single SQL query on the database. Use for SELECT, INSERT, UPDATE, DELETE operations. Returns the query results or error.',
          inputSchema: z.object({
            query: z.string().describe('The SQL query to execute'),
          }),
          execute: async ({ query }) => {
            console.log('Executing query:', query);
            const result = await execute(query);
            console.log('Query result:', result);
            return result;
          },
        }),
        executeBatch: tool({
          description: 'Execute multiple SQL queries as a batch transaction. All queries succeed or all fail together. Use for complex multi-step operations.',
          inputSchema: z.object({
            queries: z.array(z.string()).describe('Array of SQL queries to execute in order'),
          }),
          execute: async ({ queries }) => {
            console.log('Executing batch:', queries);
            const result = await executeBatch(queries);
            console.log('Batch result:', result);
            return result;
          },
        }),
        getTableSchema: tool({
          description: 'Get the schema/structure of a specific table including column names, data types, and constraints. Use this before querying unfamiliar tables.',
          inputSchema: z.object({
            tableName: z.string().describe('The name of the table to get schema for'),
          }),
          execute: async ({ tableName }) => {
            console.log('Getting schema for:', tableName);
            const result = await getTableSchema(tableName);
            console.log('Schema result:', result);
            return result;
          },
        }),
        listTables: tool({
          description: 'List all attendance tables in the database. Use this to discover what tables are available.',
          inputSchema: z.object({}),
          execute: async () => {
            console.log('Listing tables');
            const result = await listTables();
            console.log('Tables:', result);
            return result;
          },
        }),
        getTableRowCount: tool({
          description: 'Get the total number of rows in a specific table. Useful for understanding data volume.',
          inputSchema: z.object({
            tableName: z.string().describe('The name of the table to count rows for'),
          }),
          execute: async ({ tableName }) => {
            console.log('Counting rows in:', tableName);
            const result = await getTableRowCount(tableName);
            console.log('Row count:', result);
            return result;
          },
        }),
        selectQuery: tool({
          description: 'Execute a safe SELECT query with optional filtering and limiting. Good for simple data retrieval.',
          inputSchema: z.object({
            columns: z.string().describe('Columns to select (comma-separated or * for all)'),
            conditions: z.string().optional().describe('WHERE clause conditions'),
            limit: z.coerce.number().optional().describe('Maximum number of rows to return'),
            tableName: z.string().describe('The table to query'),
          }),
          execute: async ({ tableName, columns, conditions, limit }) => {
            console.log('Select query:', { tableName, columns, conditions, limit });
            const result = await selectQuery(tableName, columns || '*', conditions, limit);
            console.log('Select result:', result);
            return result;
          },
        }),
        insertRow: tool({
          description: 'Insert a new row into a table. Provide the table name and data as a JSON string of key-value pairs.',
          inputSchema: z.object({
            dataJson: z.string().describe('JSON string of data to insert'),
            tableName: z.string().describe('The table to insert into'),
          }),
          execute: async ({ tableName, dataJson }) => {
            console.log('Insert query:', { tableName, dataJson });
            try {
              const data = JSON.parse(dataJson);
              const result = await insertQuery(tableName, data);
              console.log('Insert result:', result);
              return result;
            } catch (error: any) {
              return { success: false, error: `Failed to parse JSON: ${error.message}` };
            }
          },
        }),
        updateRows: tool({
          description: 'Update existing rows in a table. Provide the table name, new data as JSON string, and conditions for which rows to update.',
          inputSchema: z.object({
            conditions: z.string().describe('WHERE clause conditions to identify rows to update'),
            dataJson: z.string().describe('JSON string of new data'),
            tableName: z.string().describe('The table to update'),
          }),
          execute: async ({ tableName, dataJson, conditions }) => {
            console.log('Update query:', { tableName, dataJson, conditions });
            try {
              const data = JSON.parse(dataJson);
              const result = await updateQuery(tableName, data, conditions);
              console.log('Update result:', result);
              return result;
            } catch (error: any) {
              return { success: false, error: `Failed to parse JSON: ${error.message}` };
            }
          },
        }),
      },
    });
  
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
})

