import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, ListChecks, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClassDesk — School lessons, schedules & assignments" },
      {
        name: "description",
        content:
          "One portal for lesson files, each student's personal class schedule and assignment reminders — updated live.",
      },
      { property: "og:title", content: "ClassDesk — School lessons, schedules & assignments" },
      {
        property: "og:description",
        content: "Lesson repository, personal schedules and assignment reminders for your class.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: BookOpen,
    title: "Lesson repository",
    body: "Teachers upload PDFs, slides, videos and docs, tagged by subject, section and date.",
  },
  {
    icon: CalendarDays,
    title: "Personal schedules",
    body: "Every student sees their own timetable — year level, section and electives included.",
  },
  {
    icon: ListChecks,
    title: "Assignments & to-dos",
    body: "Posted assignments land in each student's task list, alongside their personal tasks.",
  },
  {
    icon: Bell,
    title: "Live updates",
    body: "New lesson or schedule change? It appears instantly, with a notification.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <span className="font-display text-lg font-semibold">ClassDesk</span>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="bg-hero mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-16 text-primary-foreground shadow-lift sm:px-12">
        <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-80">School portal</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
          Lessons, schedules and assignments in one calm place.
        </h1>
        <p className="mt-5 max-w-xl text-base opacity-90">
          Admins publish lesson files and build each student's timetable. Students open the app and
          see only what belongs to them — updated the moment it changes.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth">Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-primary-foreground/40 bg-transparent">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create an account
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-16 sm:grid-cols-2">
        {features.map((f) => (
          <article key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft">
            <f.icon className="size-6 text-primary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </article>
        ))}
      </section>

      <footer className="mx-auto max-w-6xl px-5 pb-12 text-sm text-muted-foreground">
        The first account created becomes the school admin.
      </footer>
    </main>
  );
}
