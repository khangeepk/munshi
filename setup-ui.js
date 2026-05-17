const fs = require('fs');
const path = require('path');

const files = {
  'tailwind.config.ts': `import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0f172a",
        darkCard: "#1e293b",
        darkBorder: "#334155",
      },
    },
  },
  plugins: [],
};
export default config;`,

  'src/app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply transition-colors duration-300;
  }
}
`,

  'src/components/layout/Sidebar.tsx': `'use client';
import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 dark:bg-darkBg border-r border-slate-800 flex-shrink-0 flex flex-col text-slate-300">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <span className="font-bold text-white text-lg tracking-wide">LawyerSys</span>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        <Link href="/" className="block px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">Dashboard</Link>
        <Link href="/cases" className="block px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">Cases</Link>
        <Link href="/cases/new" className="block px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">Add Case</Link>
        <Link href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">Calendar</Link>
        <Link href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">Documents</Link>
        <Link href="#" className="block px-4 py-2.5 rounded-lg hover:bg-slate-800 hover:text-white transition-colors">Settings</Link>
      </nav>
    </aside>
  );
}`,

  'src/components/layout/TopNav.tsx': `'use client';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function TopNav() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="h-16 bg-white dark:bg-darkBg border-b border-slate-200 dark:border-darkBorder flex items-center justify-between px-8 transition-colors duration-300">
      <div className="flex items-center gap-2">
        {/* Mobile menu toggle goes here if needed */}
        <h2 className="font-semibold text-slate-800 dark:text-slate-200">Workspace</h2>
      </div>
      <div className="flex items-center gap-6">
        {mounted && (
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-darkCard transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-slate-300"/> : <Moon className="w-5 h-5 text-slate-600"/>}
          </button>
        )}
        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-2 border-white dark:border-darkBorder shadow-sm">
          <img src="https://i.pravatar.cc/150?u=lawyer" alt="Avatar" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
}`,

  'src/app/layout.tsx': `import { ThemeProvider } from 'next-themes';
import Sidebar from '@/components/layout/Sidebar';
import TopNav from '@/components/layout/TopNav';
import './globals.css';

export const metadata = {
  title: 'Lawyer Case Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-darkBg text-slate-900 dark:text-slate-100 font-sans antialiased flex h-screen overflow-hidden transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopNav />
            <main className="flex-1 overflow-y-auto p-8">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}`,

  'src/app/page.tsx': `export default function Dashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Here's what's happening with your cases today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Cases', value: '186' },
          { label: 'Active Cases', value: '42', highlight: 'text-emerald-500 dark:text-emerald-400' },
          { label: 'Upcoming Hearings', value: '8', highlight: 'text-rose-500 dark:text-rose-400' },
          { label: 'Closed Cases', value: '136' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-slate-200 dark:border-darkBorder p-6 hover:shadow-md transition-shadow">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className={\`text-4xl font-black mt-2 tracking-tight \${stat.highlight || 'text-slate-900 dark:text-white'}\`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-slate-200 dark:border-darkBorder p-6">
          <h2 className="text-lg font-bold mb-6">Upcoming Hearings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">State vs. Ahmad (FIR 123/24)</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Islamabad High Court • Hon. Justice Malik</p>
              </div>
              <div className="text-right">
                <span className="bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 text-xs font-bold px-3 py-1 rounded-full">TODAY</span>
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-2">10:00 AM</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Ali vs. Estate Properties</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Rawalpindi District Court • Hon. Judge Rabbani</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Oct 12, 2026</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-slate-200 dark:border-darkBorder p-6">
          <h2 className="text-lg font-bold mb-6">Recent Activity</h2>
          <div className="space-y-6 relative border-l-2 border-slate-200 dark:border-slate-700 ml-2">
             <div className="ml-4">
                <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] border-2 border-white dark:border-darkCard"></div>
                <p className="text-sm font-bold">Document Uploaded</p>
                <p className="text-xs text-slate-500">2 hours ago</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,

  'src/app/cases/page.tsx': `export default function CasesList() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Cases</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and track all active and closed litigation.</p>
        </div>
        <a href="/cases/new" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all">
          + Add Case
        </a>
      </div>

      <div className="flex gap-4 p-2 bg-white dark:bg-darkCard border border-slate-200 dark:border-darkBorder rounded-2xl shadow-sm">
        <input 
          type="text" 
          placeholder="Search cases..." 
          className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 text-slate-900 dark:text-white placeholder-slate-400 outline-none"
        />
        <div className="w-px bg-slate-200 dark:bg-darkBorder my-2"></div>
        <select className="bg-transparent border-none text-sm font-medium focus:ring-0 text-slate-700 dark:text-slate-300 px-4 outline-none">
          <option>Court: All</option>
          <option>Islamabad</option>
          <option>Rawalpindi</option>
        </select>
        <div className="w-px bg-slate-200 dark:bg-darkBorder my-2"></div>
        <select className="bg-transparent border-none text-sm font-medium focus:ring-0 text-slate-700 dark:text-slate-300 px-4 pr-6 outline-none">
          <option>Status: All</option>
          <option>Active</option>
          <option>Pending</option>
        </select>
      </div>

      <div className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-slate-200 dark:border-darkBorder overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-bold tracking-wider border-b border-slate-200 dark:border-darkBorder">
            <tr>
              <th className="px-6 py-4">Case Title</th>
              <th className="px-6 py-4">Court & Judge</th>
              <th className="px-6 py-4">Next Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
              <td className="px-6 py-4">
                <p className="font-bold text-slate-900 dark:text-white">State vs. Ahmad</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Criminal • FIR 123/24</p>
              </td>
              <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                <p>Rawalpindi District</p>
                <p className="text-xs text-slate-400 mt-1">Judge Rabbani</p>
              </td>
              <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">Oct 12, 2026</td>
              <td className="px-6 py-4">
                <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                  ACTIVE
                </span>
              </td>
              <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm">View Details</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}`,

  'src/app/cases/new/page.tsx': `export default function AddCase() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Open New Case</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Enter the complete details to register a new litigation.</p>
      </div>

      <form className="space-y-8">
        <div className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-slate-200 dark:border-darkBorder p-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 w-6 h-6 flex justify-center items-center rounded-full text-xs">1</span>
            Basic Information
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Case Title</label>
              <input type="text" className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-darkBorder rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow" placeholder="e.g., State vs. John Doe" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Case From (Plaintiff)</label>
              <input type="text" className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-darkBorder rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Case Against (Defendant)</label>
              <input type="text" className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-darkBorder rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-darkCard rounded-2xl shadow-sm border border-slate-200 dark:border-darkBorder p-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
             <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 w-6 h-6 flex justify-center items-center rounded-full text-xs">2</span>
             Legal Information
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Court Location</label>
              <select className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-darkBorder rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option>Islamabad</option>
                <option>Rawalpindi</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Judge Name</label>
              <input type="text" className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-darkBorder rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" className="px-6 py-3 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="submit" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-3 rounded-xl font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all">
            Save Case
          </button>
        </div>
      </form>
    </div>
  );
}`
};

Object.entries(files).forEach(([filepath, content]) => {
  const fullPath = path.join(__dirname, filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
});
console.log('UI upgrade script complete.');
