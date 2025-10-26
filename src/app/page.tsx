'use client';

import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, FileText, Calendar, Scale, Gavel, Landmark, Building, MessageCircle } from 'lucide-react';

// ✅ Feature list
const features = [
  {
    icon: Briefcase,
    title: 'Comprehensive Case Management',
    description:
      'Track case progress, manage documents, and keep all case-related information in one organized place.',
  },
  {
    icon: Users,
    title: 'Effortless Client Relations',
    description:
      'Maintain detailed client records, manage communications, and track all interactions seamlessly.',
  },
  {
    icon: FileText,
    title: 'Automated Billing & Invoicing',
    description:
      'Generate professional invoices, track payment statuses, and manage receipts with just a few clicks.',
  },
  {
    icon: Calendar,
    title: 'Integrated Scheduling',
    description:
      'Manage appointments, set reminders, and keep your firm’s schedule organized with an integrated calendar.',
  },
];

// ✅ Showcase items (alternating layout)
const showcase = [
  {
    img: '/assets/law1.webp',
    title: 'Our Commitment to Justice',
    desc: 'For decades, our firm has stood at the forefront of justice—defending rights and championing fairness with professionalism and integrity.',
  },
  {
    img: '/assets/Lawyer.webp',
    title: 'Experienced Legal Team',
    desc: 'Our team brings together decades of combined experience across diverse fields of law, ensuring every case receives top-tier attention.',
  },
  {
    img: '/assets/court of arms.png',
    title: 'Tradition Meets Innovation',
    desc: 'We embrace technology while maintaining the values and rigor of traditional legal practice to serve clients efficiently and effectively.',
  },
  {
    img: '/assets/supreme.jpg',
    title: 'Trusted by Institutions',
    desc: 'Our reputation is built on consistency, trust, and the pursuit of excellence in every client relationship.',
  },
];

// ✅ Practice areas
const practices = [
  { icon: Scale, title: 'Corporate Law', desc: 'Advising businesses on contracts, compliance, and corporate governance.' },
  { icon: Gavel, title: 'Litigation', desc: 'Representing clients in civil and commercial disputes with strategic precision.' },
  { icon: Landmark, title: 'Property & Conveyancing', desc: 'Managing land transfers, leases, and all real estate documentation.' },
  { icon: Building, title: 'Family & Employment Law', desc: 'Offering compassionate, sound counsel for family and workplace matters.' },
];

// ✅ Testimonials
const testimonials = [
  {
    quote:
      'R.K. Njogu & Co. handled our corporate restructuring with exceptional professionalism and care. Their modern systems made the process seamless.',
    name: 'Michael Otieno',
    position: 'CEO, Sunrise Holdings Ltd.',
  },
  {
    quote:
      'From the first consultation to the court ruling, they demonstrated unmatched diligence and expertise. I felt supported every step of the way.',
    name: 'Grace Wanjiru',
    position: 'Client – Civil Litigation',
  },
  {
    quote:
      'Their ability to merge traditional legal knowledge with cutting-edge technology is what sets them apart. Highly recommended.',
    name: 'James Karanja',
    position: 'Entrepreneur',
  },
];

export default function Home() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const y1 = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const y2 = useTransform(scrollYProgress, [0, 1], ['0%', '-25%']);

  return (
    <>
      <Head>
        <title>R.K. Njogu & Co. Advocates — Modern Legal Practice</title>
        <meta
          name="description"
          content="R.K. Njogu & Co. Advocates — the operating system for modern law firms. Manage clients, cases, and billing with efficiency."
        />
      </Head>

      <div ref={ref} className="relative flex flex-col min-h-dvh overflow-hidden">
        {/* HEADER */}
        <header className="px-4 lg:px-6 h-16 flex items-center bg-card/80 backdrop-blur-md border-b sticky top-0 z-50">
          <Link href="#" className="flex items-center justify-center" prefetch={false}>
            <Logo className="h-8 w-auto text-primary" />
          </Link>
          <nav className="ml-auto flex gap-4 sm:gap-6">
            <Button asChild variant="ghost">
              <Link href="/login" prefetch={false}>
                Login
              </Link>
            </Button>
            <Button asChild>
              <Link href="/setup" prefetch={false}>
                Get Started
              </Link>
            </Button>
          </nav>
        </header>

        {/* HERO SECTION */}
        <section className="relative w-full h-[90vh] flex flex-col items-center justify-center text-center text-foreground">
          {/* Background */}
          <motion.div style={{ y: y1 }} className="absolute inset-0 -z-10">
            <Image
              src="/assets/law1.webp"
              alt="Law firm background"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center brightness-[0.45]"
            />
          </motion.div>

          {/* Hero Content */}
          <div className="container px-6 md:px-12 lg:px-24 space-y-8 z-10">
            <Logo className="w-28 h-auto mx-auto opacity-90" />
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl xl:text-6xl font-headline text-white drop-shadow-lg">
              The Operating System for Modern Law Firms
            </h1>
            <p className="max-w-[700px] mx-auto text-lg md:text-xl text-gray-200 leading-relaxed">
              R.K. Njogu & Co. Advocates provides a comprehensive suite of tools to streamline your firm's operations. Manage clients, cases, billing, and scheduling with unparalleled efficiency.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* SHOWCASE SECTION */}
        <section className="w-full py-24 md:py-32 bg-background space-y-20">
          {showcase.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: i % 2 === 0 ? 50 : -50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className={`container mx-auto px-4 md:px-6 flex flex-col lg:flex-row items-center gap-10 ${
                i % 2 !== 0 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              <div className="relative w-full lg:w-1/2 h-[400px] overflow-hidden rounded-2xl shadow-lg">
                <Image
                  src={item.img}
                  alt={item.title}
                  fill
                  className="object-cover object-center transform hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="w-full lg:w-1/2 space-y-6 text-center lg:text-left">
                <h3 className="text-3xl font-bold font-headline">{item.title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </section>

        {/* PRACTICE AREAS */}
        <section className="w-full py-24 bg-secondary/20">
          <div className="container mx-auto px-4 md:px-6 text-center space-y-12">
            <h2 className="text-3xl md:text-5xl font-bold font-headline">Our Practice Areas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {practices.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="p-8 rounded-2xl shadow-md bg-background hover:shadow-xl transition-shadow duration-300"
                >
                  <p.icon className="h-10 w-10 mx-auto text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{p.title}</h3>
                  <p className="text-muted-foreground">{p.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="w-full py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6 text-center space-y-12">
            <h2 className="text-3xl md:text-5xl font-bold font-headline">What Our Clients Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              {testimonials.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-card/70 backdrop-blur-md p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <p className="text-muted-foreground italic mb-6">“{t.quote}”</p>
                  <div className="font-semibold text-primary">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.position}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT CTA */}
        <section className="w-full py-24 bg-primary text-primary-foreground text-center space-y-8">
          <h2 className="text-4xl font-bold font-headline">Let’s Discuss Your Legal Needs</h2>
          <p className="max-w-[700px] mx-auto text-lg opacity-90">
            Schedule a consultation with our team today and experience modern, efficient, and reliable legal service.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link href="/contact">Book a Consultation</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="mailto:info@rknjogu.co.ke">Email Us</Link>
            </Button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} R.K. Njogu & Co. Advocates. All rights reserved.
          </p>
          <nav className="sm:ml-auto flex gap-4 sm:gap-6">
            <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
              Terms of Service
            </Link>
            <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
              Privacy
            </Link>
          </nav>
        </footer>
      </div>
    </>
  );
}
