import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import Lenis from 'lenis';
import { 
  Compass, Mountain, Tent, Flame, Trees, CalendarDays,
  Sun, Moon, Menu, X, ChevronRight, Star, MapPin, 
  Users, Clock, ShieldCheck, CheckCircle2, MessageSquare, 
  Settings, QrCode, ArrowUpRight, ChevronDown
} from 'lucide-react';
import AppLogo from '../../components/AppLogo';
import { HIKING_TRIPS, CATEGORIES_LIST } from '../user/data/trips';
import { mergeLandingContent, resolveIcon } from './landingContent';
import tripsApi from '../../lib/tripsApi';

export default function LandingView({ content, darkMode, onToggleDarkMode, onLaunchApp, onLaunchOrganizer, onLaunchAdmin }) {
  // All copy/lists come from the admin-managed CMS content, deep-merged over
  // the built-in defaults so every field is present even on a partial payload.
  const C = mergeLandingContent(content);
  const scrollContainerRef = useRef(null);
  const scrollContentRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [hoveredPortal, setHoveredPortal] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    tripsApi.listTrips({ limit: 100 })
      .then((list) => {
        if (!cancelled && Array.isArray(list) && list.length) {
          setTrips(list);
        } else {
          setTrips(HIKING_TRIPS);
        }
      })
      .catch(() => {
        setTrips(HIKING_TRIPS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);
  
  // Scrolled progress indicators
  const { scrollYProgress } = useScroll({ container: scrollContainerRef });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Initialize Lenis Smooth Scroll
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const lenis = new Lenis({
      wrapper: scrollContainerRef.current,
      content: scrollContentRef.current,
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  // Filter trips based on category selection
  const filteredTrips = activeCategory === 'All' 
    ? trips.slice(0, 4) 
    : trips.filter(t => t.category === activeCategory).slice(0, 4);

  // Features come straight from the CMS; the icon key + color resolve to a
  // lucide component at render time.
  const features = C.features.items;
  const testimonials = C.testimonials.items;
  const faqs = C.faq.items;

  // The three portals are keyed — each binds to a real launch action + brand
  // gradient here, while their copy (title/badge/desc/cta/features) is editable.
  const PORTAL_STYLE = {
    hiker: { action: onLaunchApp, color: 'from-spy-orange to-orange-600', shadow: 'shadow-spy-orange/20' },
    organizer: { action: onLaunchOrganizer, color: 'from-forest-500 to-forest-700', shadow: 'shadow-forest-500/20' },
    admin: { action: onLaunchAdmin, color: 'from-zinc-700 to-zinc-900 dark:from-zinc-800 dark:to-zinc-950', shadow: 'shadow-zinc-700/25' },
  };
  const portals = C.portals.items.map((p) => ({
    ...p,
    id: p.key,
    action: PORTAL_STYLE[p.key]?.action || onLaunchApp,
    color: PORTAL_STYLE[p.key]?.color || 'from-spy-orange to-orange-600',
    shadow: PORTAL_STYLE[p.key]?.shadow || 'shadow-spy-orange/20',
  }));

  // Framer Motion Animation Presets
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1
      }
    }
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 35 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring", stiffness: 80, damping: 15 } 
    }
  };

  const scrollTriggerSettings = {
    initial: "hidden",
    whileInView: "show",
    viewport: { once: true, margin: "-80px" }
  };

  return (
    <div 
      ref={scrollContainerRef}
      className={`w-full h-screen overflow-y-auto overflow-x-hidden ${darkMode ? 'dark bg-elegant-bg text-elegant-text' : 'bg-[#F6F1E5] text-zinc-800'} transition-colors duration-500 font-sans`}
    >
      {/* Extremely Smooth Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-spy-orange via-orange-500 to-forest-500 origin-left z-[100] shadow-xs shadow-spy-orange/20" 
        style={{ scaleX }} 
      />

      <div ref={scrollContentRef} className="w-full flex flex-col items-center">
        
        {/* Dynamic Slow-Drifting Ambient Blurs */}
        <motion.div 
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.1, 0.9, 1]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-forest-500/10 dark:bg-forest-500/8 blur-[120px] pointer-events-none z-0"
        />
        <motion.div 
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 40, -30, 0],
            scale: [1, 0.9, 1.1, 1]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[20%] right-1/4 w-[400px] h-[400px] rounded-full bg-spy-orange/10 dark:bg-spy-orange/8 blur-[150px] pointer-events-none z-0"
        />

        {/* 1. STICKY HEADER WITH INTERACTIVE NAVIGATION UNDERLINE */}
        <header className="sticky top-0 w-full z-50 backdrop-blur-md bg-[#F6F1E5]/75 dark:bg-elegant-bg/75 border-b border-zinc-200/50 dark:border-elegant-border/80 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* Logo Group */}
            <motion.div 
              onClick={onLaunchApp}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <AppLogo size={32} className="text-forest-600 dark:text-elegant-green" />
              <span className="font-display font-bold text-2xl tracking-tight bg-gradient-to-r from-forest-700 via-forest-500 to-spy-orange dark:from-white dark:to-elegant-text bg-clip-text text-transparent">
                {C.header.logoText}
              </span>
            </motion.div>

            {/* Desktop Navigation Links with sliding underline animation */}
            <nav className="hidden md:flex items-center gap-8" onMouseLeave={() => setHoveredLink(null)}>
              {C.header.navLinks.map((link) => (
                <a
                  key={link.href + link.label}
                  href={link.href}
                  onMouseEnter={() => setHoveredLink(link.href)}
                  className="relative text-sm font-semibold tracking-wide py-2 text-zinc-600 dark:text-elegant-text/80 hover:text-spy-orange dark:hover:text-white transition-colors duration-250 capitalize"
                >
                  {link.label}
                  {hoveredLink === link.href && (
                    <motion.span
                      layoutId="navUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-spy-orange rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 26 }}
                    />
                  )}
                </a>
              ))}
            </nav>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <motion.button 
                onClick={onToggleDarkMode} 
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                className="p-2.5 rounded-xl border border-zinc-200 dark:border-elegant-border hover:bg-zinc-100 dark:hover:bg-elegant-card text-zinc-600 dark:text-elegant-text transition-colors cursor-pointer"
                aria-label="Toggle Theme"
              >
                {darkMode ? <Sun className="w-5 h-5 text-spy-orange" /> : <Moon className="w-5 h-5" />}
              </motion.button>

              <motion.button 
                onClick={onLaunchApp}
                whileHover={{ 
                  scale: 1.03,
                  boxShadow: "0 10px 20px -5px rgba(45, 90, 39, 0.3)"
                }}
                whileTap={{ scale: 0.97 }}
                className="px-5 py-2.5 rounded-xl bg-forest-500 hover:bg-forest-600 text-white font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                {C.header.ctaLabel}
                <ArrowUpRight className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Mobile Menu Toggle button */}
            <div className="flex md:hidden items-center gap-3">
              <button 
                onClick={onToggleDarkMode} 
                className="p-2 rounded-lg border border-zinc-200 dark:border-elegant-border text-zinc-600 dark:text-elegant-text"
              >
                {darkMode ? <Sun className="w-5 h-5 text-spy-orange" /> : <Moon className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg border border-zinc-200 dark:border-elegant-border text-zinc-600 dark:text-elegant-text"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="md:hidden border-b border-zinc-200 dark:border-elegant-border bg-[#EAE2D0]/95 dark:bg-elegant-bg/95 backdrop-blur-md px-4 py-6 flex flex-col gap-4 overflow-hidden"
              >
                {C.header.navLinks.map((link) => (
                  <a
                    key={link.href + link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-base font-semibold text-zinc-700 dark:text-white capitalize"
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="border-zinc-200 dark:border-elegant-border" />
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => { setMobileMenuOpen(false); onLaunchApp(); }}
                    className="w-full py-3 rounded-xl bg-forest-500 text-white font-semibold text-center flex items-center justify-center gap-2"
                  >
                    Open Hiker App
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setMobileMenuOpen(false); onLaunchOrganizer(); }}
                    className="w-full py-3 rounded-xl border border-zinc-300 dark:border-elegant-border font-semibold text-center text-zinc-700 dark:text-white"
                  >
                    Organizer Portal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* 2. HERO SECTION WITH DRIFTING APP MOCKUP */}
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 flex flex-col lg:flex-row items-center gap-16 z-10">
          <div className="flex-1 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 120, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-500/10 dark:bg-forest-500/15 border border-forest-500/20 text-forest-700 dark:text-[#6f9780] text-xs font-semibold uppercase tracking-wider mb-6"
            >
              <Flame className="w-3.5 h-3.5 text-spy-orange animate-pulse" />
              {C.hero.badge}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-none mb-6"
            >
              {C.hero.titleLead}{" "}
              <span className="relative inline-block bg-gradient-to-r from-spy-orange via-orange-500 to-forest-500 bg-clip-text text-transparent">
                {C.hero.titleHighlight}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
              className="text-lg text-zinc-600 dark:text-elegant-text/70 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-normal"
            >
              {C.hero.subtitle}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <motion.button 
                onClick={onLaunchApp}
                whileHover={{ 
                  scale: 1.03,
                  boxShadow: "0 15px 30px -5px rgba(45, 90, 39, 0.4)",
                  y: -2
                }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-forest-500 hover:bg-forest-600 text-white font-semibold flex items-center justify-center gap-3 shadow-xl shadow-forest-500/35 transition-all cursor-pointer"
              >
                {C.hero.primaryCta}
                <Compass className="w-5 h-5 animate-spin-slow" />
              </motion.button>
              
              <motion.button 
                onClick={onLaunchOrganizer}
                whileHover={{ 
                  scale: 1.03,
                  boxShadow: "0 15px 30px -5px rgba(0, 0, 0, 0.1)",
                  y: -2
                }}
                whileTap={{ scale: 0.97 }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white dark:bg-elegant-card text-zinc-800 dark:text-white border border-zinc-200 dark:border-elegant-border hover:border-zinc-400 dark:hover:border-[#6f9780]/40 font-semibold flex items-center justify-center gap-3 shadow-lg shadow-zinc-200/20 transition-all cursor-pointer"
              >
                {C.hero.secondaryCta}
                <ArrowUpRight className="w-5 h-5 text-zinc-400" />
              </motion.button>
            </motion.div>

            {/* Metrics block */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-12 grid grid-cols-3 gap-6 border-t border-zinc-200 dark:border-elegant-border pt-8 max-w-lg mx-auto lg:mx-0"
            >
              {C.hero.metrics.map((metric, i) => (
                <div key={i}>
                  <motion.h4 
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.7 + i * 0.1 }}
                    className="font-display font-bold text-2xl text-forest-600 dark:text-elegant-orange"
                  >
                    {metric.label}
                  </motion.h4>
                  <p className="text-xs text-zinc-500 dark:text-elegant-text/50">{metric.sub}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Interactive Hiker Phone Mockup with floating drift animation */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 50 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: [0, -12, 0] 
            }}
            transition={{
              opacity: { duration: 0.8 },
              scale: { duration: 0.8 },
              y: {
                repeat: Infinity,
                duration: 4.5,
                ease: "easeInOut"
              }
            }}
            className="flex-1 w-full max-w-[400px] flex justify-center relative z-10"
          >
            {/* Phone Frame mockup */}
            <div className="relative w-[285px] h-[550px] rounded-[40px] border-[8px] border-zinc-800 dark:border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden flex flex-col">
              
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-zinc-800 rounded-b-xl z-30 flex items-center justify-center">
                <div className="w-10 h-1 bg-zinc-900 rounded-full mb-0.5"></div>
              </div>

              {/* Status Bar */}
              <div className="h-8 bg-forest-950 px-5 pt-2 flex items-center justify-between text-[9px] font-semibold text-white/95 z-20">
                <span>12:00 PM</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <div className="w-4 h-2 border border-white/60 rounded-xs p-0.5 flex items-center">
                    <div className="h-full w-2.5 bg-white rounded-3xs"></div>
                  </div>
                </div>
              </div>

              {/* Simulated App Screen View */}
              <div className="flex-1 bg-[#0A120E] text-white p-3.5 overflow-hidden relative flex flex-col select-none">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <span className="text-[8px] text-white/50 block font-medium uppercase tracking-wider">EXPLORE TREKS</span>
                    <span className="font-display font-bold text-sm text-elegant-text">Hey Hiker! 👋</span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-elegant-card flex items-center justify-center border border-white/5">
                    <Star className="w-3.5 h-3.5 text-spy-orange fill-spy-orange" />
                  </div>
                </div>

                {/* AI Card */}
                <div className="rounded-xl p-2.5 bg-gradient-to-br from-forest-500/20 to-forest-500/5 border border-forest-500/15 mb-2.5">
                  <div className="flex items-center gap-1.5 mb-1 text-[8px] font-semibold tracking-wider text-spy-orange uppercase">
                    <SparklesIcon className="w-3 h-3 text-spy-orange animate-pulse" />
                    <span>AI recommendation</span>
                  </div>
                  <h4 className="text-[11px] font-bold font-display text-white">Kedarkantha Winter Peak</h4>
                  <p className="text-[8px] text-white/70 mt-0.5 leading-snug">Ideal match for Beginner experience & Moderate fitness level.</p>
                </div>

                {/* Search Bar */}
                <div className="h-8 rounded-lg bg-elegant-card border border-elegant-border flex items-center px-2.5 mb-2.5 text-white/40 text-[10px]">
                  <Compass className="w-3 h-3 mr-1.5" />
                  <span>Search Kasol, Manali...</span>
                </div>

                {/* Trek List */}
                <div className="flex-1 flex flex-col gap-2 overflow-hidden">
                  <div className="text-[8px] font-bold text-white/50 tracking-wider">POPULAR EXPEDITIONS</div>
                  
                  {/* Mock Hiker Card */}
                  <div className="rounded-xl bg-elegant-card border border-elegant-border overflow-hidden flex flex-col h-[110px]">
                    <div className="flex-1 bg-cover bg-center relative" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80')` }}>
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#0A120E]/80 text-[7px] font-bold text-red-400 uppercase tracking-wide">Difficult</div>
                    </div>
                    <div className="p-2 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-white truncate max-w-[140px]">Himalayan Ridge Pass</span>
                        <span className="text-[10px] font-black text-spy-orange">₹349</span>
                      </div>
                      <div className="flex justify-between items-center mt-0.5 text-[8px] text-white/50">
                        <span className="flex items-center gap-0.5"><MapPin className="w-2 h-2" /> Kasol, HP</span>
                        <span className="flex items-center gap-0.5"><Star className="w-2 h-2 text-yellow-400 fill-yellow-400" /> 4.9</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Tooltip Hotspots */}
                <div className="absolute inset-0 bg-transparent flex flex-col justify-between pointer-events-none z-20">
                  <div className="absolute top-[86px] right-2 pointer-events-auto">
                    <TooltipHotspot text="AI matching aligns difficulty with your specific experience levels." />
                  </div>
                  <div className="absolute bottom-[44px] left-4 pointer-events-auto">
                    <TooltipHotspot text="Checkout simulation issues permit passes and ticket codes instantly." />
                  </div>
                </div>

                {/* Bottom navigation */}
                <div className="h-11 border-t border-elegant-border flex items-center justify-around text-[8px] font-medium text-white/60 bg-[#0A120E] -mx-4 -mb-4 px-4 pt-1 mt-auto">
                  <div className="flex flex-col items-center text-spy-orange"><Mountain className="w-3.5 h-3.5 mb-0.5" /><span>Home</span></div>
                  <div className="flex flex-col items-center"><Compass className="w-3.5 h-3.5 mb-0.5" /><span>Explore</span></div>
                  <div className="flex flex-col items-center"><CalendarDays className="w-3.5 h-3.5 mb-0.5" /><span>Bookings</span></div>
                  <div className="flex flex-col items-center"><Star className="w-3.5 h-3.5 mb-0.5" /><span>Profile</span></div>
                </div>
              </div>
            </div>

            {/* Glowing Backdrop pulse */}
            <div className="absolute -inset-4 bg-forest-500/20 rounded-[56px] blur-xl -z-10 animate-pulse-subtle"></div>
          </motion.div>
        </section>

        {/* 3. STAGGERED FADE-IN APP FEATURES SECTION */}
        {C.features.visible && (
        <section id="features" className="w-full border-t border-zinc-200 dark:border-elegant-border/80 py-24 bg-[#EDE6D4]/50 dark:bg-elegant-card/10 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              {...scrollTriggerSettings}
              variants={staggerContainer}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <motion.h2 variants={staggerItem} className="font-display font-bold text-3xl sm:text-4xl mb-4">
                {C.features.heading}
              </motion.h2>
              <motion.p variants={staggerItem} className="text-zinc-600 dark:text-elegant-text/75 leading-relaxed">
                {C.features.subheading}
              </motion.p>
            </motion.div>

            {/* Features Staggered Grid */}
            <motion.div 
              {...scrollTriggerSettings}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {features.map((feat, idx) => {
                const Icon = resolveIcon(feat.icon);
                return (
                <motion.div
                  key={idx}
                  variants={staggerItem}
                  whileHover={{
                    y: -8,
                    scale: 1.02,
                    borderColor: "rgba(242, 125, 38, 0.4)",
                    boxShadow: "0 15px 30px -10px rgba(0, 0, 0, 0.1)"
                  }}
                  transition={{ type: "spring", stiffness: 120, damping: 15 }}
                  className="p-8 rounded-2xl bg-[#FCFAF2] dark:bg-elegant-card border border-zinc-200/60 dark:border-elegant-border/80 shadow-md hover:shadow-xl transition-all duration-300"
                >
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    className="w-12 h-12 rounded-xl bg-forest-500/10 dark:bg-elegant-green/20 flex items-center justify-center mb-6"
                  >
                    <Icon className={`w-6 h-6 ${feat.iconColor || 'text-spy-orange'}`} />
                  </motion.div>
                  <h3 className="font-display font-bold text-lg mb-3">{feat.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-elegant-text/60 leading-relaxed">{feat.desc}</p>
                </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
        )}

        {/* 4. EXPEDITIONS PREVIEW (DYNAMIC CATALOG WITH ANIMEPRESENCE) */}
        {C.expeditions.visible && (
        <section id="expeditions" className="w-full py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl mb-3">{C.expeditions.heading}</h2>
              <p className="text-zinc-600 dark:text-elegant-text/70">{C.expeditions.subheading}</p>
            </div>
            
            {/* Filter Pills with animated background bubble */}
            <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2.5 relative w-full md:w-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              <button 
                onClick={() => setActiveCategory('All')}
                className={`relative px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-250 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeCategory === 'All' 
                    ? 'text-white' 
                    : 'bg-zinc-200/50 hover:bg-zinc-200 dark:bg-elegant-card dark:hover:bg-elegant-border text-zinc-600 dark:text-elegant-text'
                }`}
              >
                {activeCategory === 'All' && (
                  <motion.div 
                    layoutId="categoryBubble" 
                    className="absolute inset-0 bg-forest-500 rounded-xl z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10">All Treks</span>
              </button>
              {CATEGORIES_LIST.map((cat) => (
                <button 
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`relative px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-250 cursor-pointer shrink-0 whitespace-nowrap ${
                    activeCategory === cat.id 
                      ? 'text-white' 
                      : 'bg-zinc-200/50 hover:bg-zinc-200 dark:bg-elegant-card dark:hover:bg-elegant-border text-zinc-600 dark:text-elegant-text'
                  }`}
                >
                  {activeCategory === cat.id && (
                    <motion.div 
                      layoutId="categoryBubble" 
                      className="absolute inset-0 bg-forest-500 rounded-xl z-0"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  <span className="relative z-10">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Staggered Trek Cards Grid */}
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            <AnimatePresence mode="popLayout">
              {loading ? (
                [1, 2, 3, 4].map((n) => (
                  <div key={n} className="rounded-2xl overflow-hidden bg-[#FCFAF2] dark:bg-elegant-card border border-zinc-200/60 dark:border-elegant-border/70 flex flex-col shadow-md animate-pulse-subtle h-[320px]">
                    <div className="aspect-[4/3] w-full skeleton-loader" />
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="h-4 rounded-md skeleton-loader w-2/3" />
                        <div className="h-3 rounded-md skeleton-loader w-1/2" />
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-3 rounded-md skeleton-loader w-1/4" />
                        <div className="h-4 rounded-md skeleton-loader w-1/5" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredTrips.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-16 text-center text-zinc-400 dark:text-zinc-500 font-sans border-2 border-dashed border-zinc-200 dark:border-elegant-border/80 rounded-3xl"
                >
                  <p className="text-sm font-semibold">No Featured Journeys Right Now</p>
                  <p className="text-xs opacity-75 mt-1">Register as an organizer or log in to list the first trek!</p>
                </motion.div>
              ) : (
                filteredTrips.map((trip) => (
                  <motion.div 
                    key={trip.id}
                    layout
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    whileHover={{ y: -8, scale: 1.01 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="rounded-2xl overflow-hidden bg-[#FCFAF2] dark:bg-elegant-card border border-zinc-200/60 dark:border-elegant-border/70 flex flex-col shadow-md hover:shadow-xl transition-all duration-300 group"
                  >
                    {/* Cover Section */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                      <img 
                        src={trip.coverImage} 
                        alt={trip.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      
                      {/* Difficulty Badge */}
                      <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm z-10 ${
                        trip.difficulty === 'Easy' 
                          ? 'bg-emerald-500/90 text-white' 
                          : trip.difficulty === 'Moderate'
                          ? 'bg-amber-500/90 text-white'
                          : 'bg-rose-500/90 text-white'
                      }`}>
                        {trip.difficulty}
                      </div>

                      {/* Specs */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                        <div className="px-2 py-1 rounded-md bg-black/75 backdrop-blur-xs text-[9px] font-bold text-white flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {trip.durationDays} Days
                        </div>
                        <div className="px-2 py-1 rounded-md bg-black/75 backdrop-blur-xs text-[9px] font-bold text-white flex items-center gap-1">
                          <Users className="w-2.5 h-2.5" />
                          Max {trip.maxGroupSize}
                        </div>
                      </div>
                      {/* Dark overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60 pointer-events-none" />
                    </div>

                    {/* Trek Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-forest-500 dark:text-[#6f9780] mb-1.5">
                          <MapPin className="w-3 h-3" />
                          {trip.location}
                        </div>
                        <h3 className="font-display font-bold text-base leading-snug line-clamp-2 hover:text-spy-orange cursor-pointer mb-2" onClick={onLaunchApp}>
                          {trip.name}
                        </h3>
                        
                        <div className="flex items-center gap-1.5 mb-4">
                          <div className="flex items-center text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </div>
                          <span className="text-xs font-bold text-zinc-700 dark:text-white/95">{trip.rating}</span>
                          <span className="text-[10px] text-zinc-400">({trip.reviewsCount} reviews)</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-elegant-border/50">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-400 block tracking-wider">Per Person</span>
                          <span className="text-lg font-black text-forest-600 dark:text-elegant-orange">₹{trip.price}</span>
                        </div>
                        <motion.button 
                          onClick={onLaunchApp}
                          whileHover={{ scale: 1.1, backgroundColor: "#2D5A27", color: "#fff" }}
                          whileTap={{ scale: 0.9 }}
                          className="p-2.5 rounded-xl bg-forest-500/10 dark:bg-elegant-green/20 text-forest-700 dark:text-elegant-text transition-all border border-forest-500/10 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </motion.div>

          <div className="text-center mt-12">
            <motion.button 
              onClick={onLaunchApp}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="px-6 py-3.5 rounded-xl border border-forest-500/35 hover:bg-forest-500/10 text-forest-700 dark:text-[#6f9780] font-semibold text-sm cursor-pointer transition-all"
            >
              {C.expeditions.ctaLabel}
            </motion.button>
          </div>
        </section>
        )}

        {/* 5. IMMERSIVE PORTAL GATEWAYS WITH HOVER BLUR GLOW */}
        {C.portals.visible && (
        <section id="gateways" className="w-full border-t border-zinc-200 dark:border-elegant-border/80 py-24 bg-[#EDE6D4]/50 dark:bg-elegant-card/10 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              {...scrollTriggerSettings}
              variants={staggerContainer}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <motion.h2 variants={staggerItem} className="font-display font-bold text-3xl sm:text-4xl mb-4">
                {C.portals.heading}
              </motion.h2>
              <motion.p variants={staggerItem} className="text-zinc-600 dark:text-elegant-text/75">
                {C.portals.subheading}
              </motion.p>
            </motion.div>

            <motion.div 
              {...scrollTriggerSettings}
              variants={staggerContainer}
              className={`grid grid-cols-1 ${portals.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : 'lg:grid-cols-3'} gap-8`}
            >
              {portals.map((portal) => (
                <motion.div 
                  key={portal.id}
                  variants={staggerItem}
                  onMouseEnter={() => setHoveredPortal(portal.id)}
                  onMouseLeave={() => setHoveredPortal(null)}
                  whileHover={{ 
                    y: -8, 
                    transition: { type: "spring", stiffness: 100, damping: 15 }
                  }}
                  className={`p-8 rounded-3xl bg-[#FCFAF2] dark:bg-elegant-card border transition-all duration-500 relative flex flex-col justify-between overflow-hidden ${
                    hoveredPortal === portal.id 
                      ? `shadow-2xl border-forest-500/40 dark:border-forest-500/40` 
                      : 'shadow-lg border-zinc-200/60 dark:border-elegant-border'
                  }`}
                >
                  {/* Subtle hover background radial highlight */}
                  <div className={`absolute -inset-48 bg-gradient-to-r ${portal.color} opacity-0 hover:opacity-[0.03] dark:hover:opacity-[0.04] rounded-full blur-2xl transition-opacity duration-500 pointer-events-none`} />

                  <div className="relative z-10">
                    {/* Portal Header */}
                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-forest-500/10 text-forest-700 dark:text-[#6f9780]">
                        {portal.badge}
                      </span>
                      <motion.div
                        animate={hoveredPortal === portal.id ? { x: 3, y: -3 } : {}}
                        transition={{ type: "spring", stiffness: 200 }}
                      >
                        <ArrowUpRight className={`w-5 h-5 text-zinc-400 transition-colors duration-300 ${
                          hoveredPortal === portal.id ? 'text-spy-orange' : ''
                        }`} />
                      </motion.div>
                    </div>

                    <h3 className="font-display font-bold text-2xl mb-4">{portal.title}</h3>
                    <p className="text-sm text-zinc-500 dark:text-elegant-text/60 leading-relaxed mb-6">{portal.desc}</p>

                    {/* Features checklist */}
                    <div className="flex flex-col gap-2.5 mb-8">
                      {portal.features.map((feat, fidx) => (
                        <div key={fidx} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-forest-500 shrink-0" />
                          <span className="text-zinc-600 dark:text-elegant-text/75">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Launch button with bounce shadow on hover */}
                  <motion.button 
                    onClick={portal.action}
                    whileHover={{ 
                      scale: 1.025,
                      boxShadow: `0 12px 25px -5px rgba(242, 125, 38, 0.25)` 
                    }}
                    whileTap={{ scale: 0.985 }}
                    className={`w-full py-4 rounded-2xl bg-gradient-to-r ${portal.color} text-white font-bold text-sm tracking-wide shadow-md cursor-pointer transition-all relative z-10`}
                  >
                    {portal.cta}
                  </motion.button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
        )}

        {/* 6. TESTIMONIALS WITH CASCADING ENTRY */}
        {C.testimonials.visible && (
        <section id="testimonials" className="w-full py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            {...scrollTriggerSettings}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.h2 variants={staggerItem} className="font-display font-bold text-3xl sm:text-4xl mb-4">
              {C.testimonials.heading}
            </motion.h2>
            <motion.p variants={staggerItem} className="text-zinc-600 dark:text-elegant-text/75">
              {C.testimonials.subheading}
            </motion.p>
          </motion.div>

          <motion.div 
            {...scrollTriggerSettings}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {testimonials.map((test, idx) => (
              <motion.div 
                key={idx}
                variants={staggerItem}
                whileHover={{ y: -6 }}
                className="p-8 rounded-2xl bg-[#FCFAF2] dark:bg-elegant-card border border-zinc-200/60 dark:border-elegant-border flex flex-col justify-between shadow-lg relative transition-all duration-300"
              >
                <div>
                  <span className="absolute top-4 right-6 font-display font-black text-6xl text-forest-500/5 select-none pointer-events-none">”</span>
                  
                  <div className="flex items-center gap-1 text-amber-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < test.rating ? 'fill-current' : 'text-zinc-200 dark:text-elegant-border'}`} />
                    ))}
                  </div>

                  <p className="text-sm italic text-zinc-600 dark:text-elegant-text/80 leading-relaxed mb-6">
                    "{test.comment}"
                  </p>
                </div>

                <div className="flex items-center gap-3.5 pt-6 border-t border-zinc-100 dark:border-elegant-border/50">
                  <img src={test.avatar} alt={test.name} className="w-11 h-11 rounded-full object-cover bg-zinc-200" />
                  <div>
                    <h4 className="font-display font-bold text-sm">{test.name}</h4>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">{test.role}</span>
                    <span className="block text-[9px] font-bold text-forest-500 mt-0.5">{test.trek}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
        )}

        {/* 7. FAQ ACCORDION WITH SLIDING DRAWER & CARET ANIMATION */}
        {C.faq.visible && (
        <section id="faq" className="w-full border-t border-zinc-200 dark:border-elegant-border/80 py-24 bg-[#EDE6D4]/50 dark:bg-elegant-card/10 transition-colors duration-300">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
                {C.faq.heading}
              </h2>
              <p className="text-zinc-600 dark:text-elegant-text/75">
                {C.faq.subheading}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {faqs.map((faq, idx) => (
                <div 
                  key={idx}
                  className="rounded-2xl border border-zinc-200 dark:border-elegant-border bg-[#FCFAF2] dark:bg-elegant-card overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left font-display font-bold text-base hover:text-spy-orange transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <motion.div
                      animate={{ rotate: expandedFaq === idx ? 180 : 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <ChevronDown className={`w-5 h-5 text-zinc-400 shrink-0 transition-colors ${
                        expandedFaq === idx ? 'text-spy-orange' : ''
                      }`} />
                    </motion.div>
                  </button>
                  
                  <AnimatePresence initial={false}>
                    {expandedFaq === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                      >
                        <div className="px-6 pb-6 text-sm text-zinc-500 dark:text-elegant-text/60 leading-relaxed border-t border-zinc-100 dark:border-elegant-border/50 pt-4">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* FOOTER */}
        <footer className="w-full border-t border-zinc-200 dark:border-elegant-border bg-[#F6F1E5] dark:bg-elegant-bg transition-colors duration-300 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={onLaunchApp}>
              <AppLogo size={28} className="text-forest-600 dark:text-elegant-green" />
              <span className="font-display font-black text-xl tracking-tight bg-gradient-to-r from-forest-700 via-forest-500 to-spy-orange dark:from-white dark:to-elegant-text bg-clip-text text-transparent">
                {C.header.logoText}
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {C.footer.links.map((link) => (
                <a key={link.href + link.label} href={link.href} className="hover:text-spy-orange">{link.label}</a>
              ))}
            </div>

            <div className="text-center md:text-right">
              <span className="text-[11px] text-zinc-400 block mb-1">
                {C.footer.copyright}
              </span>
              <span className="text-[10px] text-zinc-400/60 block">
                {C.footer.subtext}
              </span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

// Sparkles SVG Icon helper
function SparklesIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" />
      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" />
    </svg>
  );
}

// Hotspot with pulsing indicator and spring tooltip
function TooltipHotspot({ text }) {
  const [visible, setVisible] = useState(false);
  return (
    <div 
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {/* Pulse circle */}
      <span className="flex h-6 w-6 relative items-center justify-center cursor-pointer">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-spy-orange opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-spy-orange border-2 border-white"></span>
      </span>

      {/* Spring-animated tooltip popover */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 w-48 p-2.5 rounded-xl bg-elegant-card border border-elegant-border text-white text-[10px] leading-snug shadow-xl backdrop-blur-md bg-opacity-95 z-30"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-elegant-card"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
