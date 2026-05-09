import { Link } from "react-router-dom";
import {
  Activity,
  Trophy,
  CalendarDays,
  Image as ImageIcon,
  Users,
  GraduationCap,
  Megaphone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Activity,
    title: "Live Match Updates",
    desc: "Follow matches in real time with instant score updates and live match tracking.",
  },
  {
    icon: Trophy,
    title: "Predictions & Leaderboards",
    desc: "Predict outcomes, earn points, and compete against other fans on the leaderboard.",
  },
  {
    icon: CalendarDays,
    title: "Fixtures & Brackets",
    desc: "Stay updated with tournament schedules, standings, and upcoming matches.",
  },
  {
    icon: ImageIcon,
    title: "Gallery & Highlights",
    desc: "Catch up on tournament moments through photos, videos, and highlights.",
  },
];

const audiences = [
  { icon: GraduationCap, label: "Students" },
  { icon: Users, label: "Sports fans" },
  { icon: Megaphone, label: "Tournament organizers" },
  { icon: ShieldCheck, label: "Campus communities" },
];

export default function About() {
  return (
    <div className="w-full">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-hero-bg pointer-events-none" aria-hidden />
        <div className="container relative py-16 sm:py-24 text-center max-w-4xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> About Sportified
          </span>
          <h1 className="mt-5 font-display text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
            Live Scores. Predictions.{" "}
            <span className="text-gradient-court">Campus Rivalries.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Sportified is a modern campus sports platform built to bring tournaments, live scores,
            predictions, leaderboards, and student engagement into one connected experience.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto shadow-glow">
              <Link to="/">View Live Matches</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to="/leaderboard">Explore Leaderboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="container py-16 sm:py-20 max-w-4xl">
        <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
          Why We Built Sportified
        </h2>
        <p className="mt-4 text-muted-foreground sm:text-lg leading-relaxed">
          Campus tournaments are exciting, competitive, and full of energy — but information is
          often scattered across WhatsApp groups, flyers, and word of mouth. Sportified centralizes
          the experience with:
        </p>
        <ul className="mt-6 grid sm:grid-cols-2 gap-3">
          {[
            "Live match updates",
            "Fixtures and standings",
            "Predictions and rankings",
            "Media highlights",
            "Tournament engagement",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 text-sm"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground">All in one place.</p>
      </section>

      {/* CORE FEATURES */}
      <section className="border-t border-border bg-card/30">
        <div className="container py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
              Core Features
            </h2>
            <p className="mt-3 text-muted-foreground">
              Everything you need to follow the game, in one streamlined experience.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <Card
                key={title}
                className="group p-6 bg-card/70 border-border hover:border-primary/50 hover:shadow-glow transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-court text-primary-foreground shadow-court group-hover:scale-105 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-semibold text-base">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="container py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight">
            Built for Campus Sports Communities
          </h2>
          <p className="mt-3 text-muted-foreground">Sportified is designed for:</p>
        </div>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {audiences.map(({ icon: Icon, label }) => (
            <Card
              key={label}
              className="p-5 flex flex-col items-center text-center gap-3 bg-card/60 hover:border-primary/40 transition-colors"
            >
              <div className="grid place-items-center h-10 w-10 rounded-lg bg-accent text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </Card>
          ))}
        </div>
        <p className="mt-6 text-muted-foreground sm:text-lg max-w-3xl">
          Whether you're following your department team or managing an entire tournament,
          Sportified keeps the experience connected and engaging.
        </p>
      </section>

      {/* MOBILE FIRST */}
      <section className="border-t border-border bg-card/30">
        <div className="container py-16 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5 text-primary" /> Mobile-first
            </span>
            <h2 className="mt-4 font-display text-2xl sm:text-4xl font-bold tracking-tight">
              Designed for Mobile First
            </h2>
            <p className="mt-4 text-muted-foreground sm:text-lg leading-relaxed">
              Most campus audiences live on mobile devices. Sportified is optimized for fast,
              responsive, and smooth experiences across phones, tablets, and desktops.
            </p>
          </div>
          {/* Decorative phone mockup */}
          <div className="relative mx-auto w-full max-w-xs aspect-[9/16] rounded-[2.2rem] border border-border bg-gradient-to-br from-card to-background shadow-court p-3">
            <div className="h-full w-full rounded-[1.7rem] bg-background/80 border border-border overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary shadow-glow animate-pulse" />
                <span className="text-xs font-medium">Live · Court A</span>
              </div>
              <div className="flex-1 p-4 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-card border border-border p-3">
                  <span className="text-sm font-medium">Team Alpha</span>
                  <span className="font-display font-bold text-lg">24</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card border border-border p-3">
                  <span className="text-sm font-medium">Team Bravo</span>
                  <span className="font-display font-bold text-lg">21</span>
                </div>
                <div className="rounded-lg bg-gradient-court p-3 text-primary-foreground text-xs font-medium">
                  Predict the winner · +10 pts
                </div>
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-7 rounded-md bg-card border border-border" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VISION */}
      <section className="container py-16 sm:py-24 max-w-3xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
          The Vision
        </span>
        <h2 className="mt-5 font-display text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
          Modernize campus sports for the{" "}
          <span className="text-gradient-court">next generation.</span>
        </h2>
        <p className="mt-5 text-muted-foreground sm:text-lg">
          Our goal is simple: to make tournaments more engaging, competitive, and accessible
          through technology.
        </p>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-border">
        <div className="container py-16 sm:py-20">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-court p-8 sm:p-14 text-center text-primary-foreground shadow-court">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.4),transparent_50%)] pointer-events-none" />
            <h2 className="relative font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Follow the Game. Join the Competition.
            </h2>
            <p className="relative mt-4 text-primary-foreground/80 max-w-xl mx-auto">
              Jump in, pick your winners, and climb the leaderboard.
            </p>
            <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <Link to="/">
                  View Live Matches <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/leaderboard">Start Predicting</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
