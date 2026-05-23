import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CodeBracketIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/solid';

const visualStats = [
  { label: 'Commits', value: '1.2k', tone: 'violet' },
  { label: 'PRs', value: '48', tone: 'cyan' },
  { label: 'Sprint', value: '94%', tone: 'emerald' }
];

export default function AuthLayout({
  children,
  title,
  subtitle,
  switchText,
  switchLabel,
  switchTo,
  badge = 'AI workspace',
  mode = 'login'
}) {
  const isRegister = mode === 'register';

  return (
    <main className="auth-shell min-h-screen overflow-hidden bg-gray-950 text-white">
      <section className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="auth-hero relative hidden min-h-screen overflow-hidden px-10 py-10 lg:flex lg:flex-col lg:justify-between xl:px-14">
          <div className="relative z-10 flex items-center justify-between">
            <Link to="/" className="group flex items-center gap-3" aria-label="Go to DevTrackr home">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-[0_12px_34px_rgba(124,58,237,0.32)] backdrop-blur-xl transition-transform duration-300 group-hover:-translate-y-0.5">
                <BoltIcon className="h-5 w-5 text-white" />
              </span>
              <span>
                <span className="block text-xl font-bold tracking-tight text-white">DevTrackr</span>
                <span className="block text-xs font-medium uppercase tracking-[0.22em] text-cyan-200/70">
                  developer intelligence
                </span>
              </span>
            </Link>

            <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 shadow-[0_12px_40px_rgba(34,211,238,0.12)] backdrop-blur-xl">
              {badge}
            </div>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[620px] flex-1 flex-col justify-center py-10">
            <div className="mb-9 max-w-xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-violet-200/80">
                GitHub analytics meets sprint focus
              </p>
              <h1 className="max-w-lg text-5xl font-bold leading-[0.96] tracking-tight text-white xl:text-6xl">
                Track repos, sprints, commits and AI insights in one workspace.
              </h1>
            </div>

            <div className="auth-hero-stage relative h-[430px] w-full">
              <div className="auth-dashboard-card auth-float-primary absolute left-1/2 top-1/2 w-[430px] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/[0.12] bg-gray-950/[0.72] p-5 shadow-[0_42px_110px_rgba(3,7,18,0.78),0_0_70px_rgba(124,58,237,0.22)] backdrop-blur-2xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">live sprint</p>
                    <h2 className="mt-1 text-lg font-bold text-white">Velocity command center</h2>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-3 gap-3">
                  {visualStats.map((stat) => (
                    <div
                      key={stat.label}
                      className={`auth-stat-card auth-stat-${stat.tone} rounded-2xl border p-3`}
                    >
                      <p className="text-2xl font-bold leading-none">{stat.value}</p>
                      <p className="mt-1 text-xs font-medium text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.045] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="h-4 w-4 text-cyan-200" />
                      <span className="text-sm font-semibold text-gray-200">Commit rhythm</span>
                    </div>
                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                      +18%
                    </span>
                  </div>
                  <div className="flex h-28 items-end gap-2">
                    {[34, 58, 45, 78, 62, 88, 72, 96, 82].map((height, index) => (
                      <span
                        key={height + index}
                        className="auth-chart-bar flex-1 rounded-t-lg"
                        style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-violet-300/[0.12] bg-violet-300/[0.08] p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-400/20 text-violet-100">
                      <SparklesIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">AI insight ready</p>
                      <p className="mt-1 text-xs leading-5 text-gray-400">
                        Review queue is healthy. Two sprint risks need attention before release.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="auth-floating-card auth-float-secondary absolute left-0 top-14 w-56 rounded-2xl border border-white/[0.12] bg-gray-950/[0.68] p-4 shadow-[0_24px_60px_rgba(3,7,18,0.6)] backdrop-blur-xl">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
                  <CodeBracketIcon className="h-5 w-5 text-cyan-200" />
                  repo/devtrackr
                </div>
                <div className="space-y-2 font-mono text-xs text-gray-400">
                  <p><span className="text-violet-200">feat</span>: auth polish</p>
                  <p><span className="text-cyan-200">fix</span>: sprint filter</p>
                  <p><span className="text-emerald-200">test</span>: insight cards</p>
                </div>
              </div>

              <div className="auth-floating-card auth-float-tertiary absolute bottom-16 right-0 w-60 rounded-2xl border border-white/[0.12] bg-gray-950/70 p-4 shadow-[0_24px_70px_rgba(3,7,18,0.66)] backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">agent focus</p>
                    <p className="mt-1 text-base font-bold text-white">
                      {isRegister ? 'Workspace setup' : 'Release confidence'}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/[0.12] text-emerald-200">
                    {isRegister ? <CpuChipIcon className="h-5 w-5" /> : <ArrowTrendingUpIcon className="h-5 w-5" />}
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full w-[76%] rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-lg text-sm leading-6 text-gray-300/80">
            Premium reporting for developers who want sprint clarity without leaving their workflow.
          </div>
        </aside>

        <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="auth-form-backdrop absolute inset-0" aria-hidden="true" />

          <div className="relative z-10 w-full max-w-[470px]">
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <Link to="/" className="flex items-center gap-3" aria-label="Go to DevTrackr home">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_16px_36px_rgba(124,58,237,0.35)]">
                  <BoltIcon className="h-5 w-5 text-white" />
                </span>
                <span className="text-2xl font-bold tracking-tight">DevTrackr</span>
              </Link>
            </div>

            <div className="auth-form-card rounded-[28px] border border-white/10 bg-gray-950/[0.72] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.52)] backdrop-blur-2xl sm:p-8">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-300/10 text-violet-100 shadow-[0_16px_46px_rgba(124,58,237,0.26)]">
                  <BoltIcon className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
                {subtitle && <p className="mt-3 text-sm leading-6 text-gray-400">{subtitle}</p>}
                <p className="mt-4 text-sm text-gray-400">
                  {switchText}{' '}
                  <Link to={switchTo} className="font-semibold text-cyan-200 transition-colors duration-200 hover:text-white">
                    {switchLabel}
                  </Link>
                </p>
              </div>

              {children}

              <div className="mt-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">secure access</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-gray-500">
                <ShieldCheckIcon className="h-4 w-4" />
                <span>Protected by JWT + bcrypt</span>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
