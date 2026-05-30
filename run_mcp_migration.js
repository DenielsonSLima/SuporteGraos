import fs from 'fs';

const sql = fs.readFileSync('supabase/migrations/20260529010000_fix_dashboard_and_balances.sql', 'utf8');

const args = {
  project_id: "vqhjbsiwzgxaozcedqcn",
  query: sql
};

fs.writeFileSync('mcp_args.json', JSON.stringify(args));
