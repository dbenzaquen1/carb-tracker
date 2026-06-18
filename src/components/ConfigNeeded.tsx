/**
 * Shown when the Supabase environment variables are missing. Gives the user
 * (or whoever is deploying) the steps to finish setup.
 */
export function ConfigNeeded() {
  return (
    <div className="config-needed">
      <div className="config-card">
        <h1>Almost there 🥖</h1>
        <p>
          Carb Tracker needs a Supabase project to store data. Add these
          environment variables and reload:
        </p>
        <pre>
          <code>
            VITE_SUPABASE_URL=https://your-project.supabase.co{'\n'}
            VITE_SUPABASE_ANON_KEY=your-anon-key
          </code>
        </pre>
        <ol>
          <li>
            Create a free project at <strong>supabase.com</strong>.
          </li>
          <li>
            Run the SQL in <code>supabase/schema.sql</code> in the SQL editor.
          </li>
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and paste
            your project URL and anon key.
          </li>
        </ol>
        <p className="config-card__hint">
          Full instructions are in the project <code>README.md</code>.
        </p>
      </div>
    </div>
  )
}
