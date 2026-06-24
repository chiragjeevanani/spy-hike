/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import Lenis from 'lenis';
import { 
  Compass, Mountain, Tent, Flame, Trees, CalendarDays,
  Sun, Moon, Menu, X, ChevronRight, Star, MapPin, 
  Users, Clock, ShieldCheck, CheckCircle2, MessageSquare, 
  Settings, QrCode, ArrowUpRight, ChevronDown
} from 'lucide-react';
import { HIKING_TRIPS, CATEGORIES_LIST } from '../user/data/trips';

export default function LandingView({ darkMode, onToggleDarkMode, onLaunchApp, onLaunchOrganizer, onLaunchAdmin }) {
  const scrollContainerRef = useRef(null);
  const scrollContentRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [hoveredPortal, setHoveredPortal] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  
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
    ? HIKING_TRIPS.slice(0, 4) 
    : HIKING_TRIPS.filter(t => t.category === activeCategory).slice(0, 4);

  // Features List
  const features = [
    {
      icon: <Settings className="w-6 h-6 text-spy-orange" />,
      title: "AI Recommendation Engine",
      desc: "Tailors trek difficulty options dynamically based on your physical fitness level and alpine experience."
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
      title: "Verified Agency Guides",
      desc: "Connect directly with local Sherpa guides carrying government-audited permits and zero-accident safety records."
    },
    {
      icon: <QrCode className="w-6 h-6 text-[#4A90E2]" />,
      title: "Instant Permit Booking",
      desc: "Secure high-altitude transit passes in a streamlined 3-step wizard with simulated Razorpay checkouts."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-purple-500" />,
      title: "Real-time Coordinator Chat",
      desc: "Direct communication line with guides and coordinators to plan gear lists and coordinate base assembly."
    }
  ];

  // Testimonials
  const testimonials = [
    {
      name: "Chirag Jeevanani",
      role: "Intermediate Trekker",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      comment: "The AI recommendation matched me perfectly with the Western Ghats Monsoon Trail. Using the 3-step checkout was incredibly seamless, and the ticket QR code was instantly generated!",
      rating: 5,
      trek: "Western Ghats Monsoon Trail"
    },
    {
      name: "Priya Patel",
      role: "Advanced Mountaineer",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
      comment: "Conquering the Himalayan Ridge Pass at 4,200m was a dream. The Sherpa guides verified through Spy Hike provided top-notch geodesic domes and safety monitoring. Absolute five-star experience.",
      rating: 5,
      trek: "Himalayan Ridge Pass Trek"
    },
    {
      name: "Aarav Sharma",
      role: "Weekend Explorer",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      comment: "I loved the Jaisalmer Desert Camp. Being able to chat directly with Desert Nomad Adventures beforehand to verify standard gear rentals was very reassuring. No hassle whatsoever.",
      rating: 4,
      trek: "Stargazing Desert Camp & Trek"
    }
  ];

  // Portals gateways
  const portals = [
    {
      id: 'hiker',
      title: "Hiker Mobile App",
      badge: "Sandbox Enabled",
      desc: "Explore mountain expeditions, toggle wishlist items, customize add-ons, pay via simulated gateways, and manage live ticket bookings.",
      cta: "Launch Hiker App",
      action: onLaunchApp,
      color: "from-spy-orange to-orange-600",
      shadow: "shadow-spy-orange/20",
      features: ["AI Trek Matching", "3-Step Fast Checkout", "Direct Guide Chat", "Notifications Bell"]
    },
    {
      id: 'organizer',
      title: "Organizer Portal",
      badge: "Agency Access",
      desc: "Designed for local trekking agencies. Publish multi-day itineraries, manage seat inventory, upload dynamic photo galleries, and coordinate with hikers.",
      cta: "Launch Organizer Portal",
      action: onLaunchOrganizer,
      color: "from-forest-500 to-forest-700",
      shadow: "shadow-forest-500/20",
      features: ["Dynamic Hike Form Builder", "Booking Roster Trackers", "Simulated Hiker Reply Chat", "Verification Wizard"]
    },
    {
      id: 'admin',
      title: "Admin Console",
      badge: "Platform Control",
      desc: "Central moderation panel. Review agency registrations, verify legal credentials, audit active listings, and analyze site-wide booking revenue.",
      cta: "Launch Admin Console",
      action: onLaunchAdmin,
      color: "from-zinc-700 to-zinc-900 dark:from-zinc-800 dark:to-zinc-950",
      shadow: "shadow-zinc-700/25",
      features: ["Agency Approval System", "Global Trip Moderation", "Hiker Roster Audits", "Platform Revenue Insights"]
    }
  ];

  // FAQs
  const faqs = [
    {
      q: "What makes Spy Hike different from other booking systems?",
      a: "Spy Hike is built with a dual ecosystem: Hiker App and Organizer Portal. Hikers get direct access to local agencies without middlemen, while agencies get rich tools to manage day-by-day itineraries, add-ons, and safety lists."
    },
    {
      q: "Is the payment gateway secure?",
      a: "Yes! For demonstration purposes, we integrate a simulated Razorpay payment flow which matches the exact steps of a real bank transaction without using real funds."
    },
    {
      q: "How does the AI Recommendation Engine work?",
      a: "By auditing your user profile (Experience: Beginner/Intermediate/Advanced and Fitness Level: Low/Moderate/High), Spy Hike automatically matches you with hikes that align with your safety limits."
    }
  ];

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
              <div className="w-10 h-10 rounded-xl bg-forest-500 dark:bg-elegant-green flex items-center justify-center shadow-lg shadow-forest-500/25">
                <Compass className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-500" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight bg-gradient-to-r from-forest-700 via-forest-500 to-spy-orange dark:from-white dark:to-elegant-text bg-clip-text text-transparent">
                Spy Hike
              </span>
            </motion.div>

            {/* Desktop Navigation Links with sliding underline animation */}
            <nav className="hidden md:flex items-center gap-8" onMouseLeave={() => setHoveredLink(null)}>
              {['features', 'expeditions', 'gateways', 'testimonials', 'faq'].map((link) => (
                <a 
                  key={link}
                  href={`#${link}`} 
                  onMouseEnter={() => setHoveredLink(link)}
                  className="relative text-sm font-semibold tracking-wide py-2 text-zinc-600 dark:text-elegant-text/80 hover:text-spy-orange dark:hover:text-white transition-colors duration-250 capitalize"
                >
                  {link}
                  {hoveredLink === link && (
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
                Launch App
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
                {['features', 'expeditions', 'gateways', 'testimonials', 'faq'].map((link) => (
                  <a 
                    key={link}
                    href={`#${link}`} 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="text-base font-semibold text-zinc-700 dark:text-white capitalize"
                  >
                    {link}
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
                  <button 
                    onClick={() => { setMobileMenuOpen(false); onLaunchAdmin(); }}
                    className="w-full py-3 rounded-xl border border-zinc-300 dark:border-elegant-border font-semibold text-center text-zinc-400 dark:text-zinc-500"
                  >
                    Admin Console
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
              Conquer Himalayan Altitudes
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
              className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-none mb-6"
            >
              Conquer High Peaks with{"   "}
              <span className="relative inline-block bg-gradient-to-r from-spy-orange via-orange-500 to-forest-500 bg-clip-text text-transparent">
                Verified Guides
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
              className="text-lg text-zinc-600 dark:text-elegant-text/70 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-normal"
            >
              Spy Hike connects hiking enthusiasts with local trekking agencies. Book eco-friendly expeditions, secure wilderness transit permits, and coordinate via simulated payment models and direct organizer chats.
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
                Launch Hiker App
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
                Organizer Panel
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
              {[
                { label: "4.9★", sub: "Hiker Rating" },
                { label: "100%", sub: "Verified Guides" },
                { label: "0%", sub: "Middlemen Fee" }
              ].map((metric, i) => (
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
        <section id="features" className="w-full border-t border-zinc-200 dark:border-elegant-border/80 py-24 bg-[#EDE6D4]/50 dark:bg-elegant-card/10 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              {...scrollTriggerSettings}
              variants={staggerContainer}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <motion.h2 variants={staggerItem} className="font-display font-bold text-3xl sm:text-4xl mb-4">
                Smart Trek Platform Features
              </motion.h2>
              <motion.p variants={staggerItem} className="text-zinc-600 dark:text-elegant-text/75 leading-relaxed">
                Engineered to offer safe, transparent, and direct connections to high-elevation guides and local trek guides.
              </motion.p>
            </motion.div>

            {/* Features Staggered Grid */}
            <motion.div 
              {...scrollTriggerSettings}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {features.map((feat, idx) => (
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
                    {feat.icon}
                  </motion.div>
                  <h3 className="font-display font-bold text-lg mb-3">{feat.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-elegant-text/60 leading-relaxed">{feat.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* 4. EXPEDITIONS PREVIEW (DYNAMIC CATALOG WITH ANIMEPRESENCE) */}
        <section id="expeditions" className="w-full py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl mb-3">Popular Expeditions</h2>
              <p className="text-zinc-600 dark:text-elegant-text/70">View our active treks directly managed by local registered agencies.</p>
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
              {filteredTrips.map((trip) => (
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
              ))}
            </AnimatePresence>
          </motion.div>

          <div className="text-center mt-12">
            <motion.button 
              onClick={onLaunchApp}
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.96 }}
              className="px-6 py-3.5 rounded-xl border border-forest-500/35 hover:bg-forest-500/10 text-forest-700 dark:text-[#6f9780] font-semibold text-sm cursor-pointer transition-all"
            >
              Explore Full Catalog
            </motion.button>
          </div>
        </section>

        {/* 5. IMMERSIVE PORTAL GATEWAYS WITH HOVER BLUR GLOW */}
        <section id="gateways" className="w-full border-t border-zinc-200 dark:border-elegant-border/80 py-24 bg-[#EDE6D4]/50 dark:bg-elegant-card/10 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div 
              {...scrollTriggerSettings}
              variants={staggerContainer}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <motion.h2 variants={staggerItem} className="font-display font-bold text-3xl sm:text-4xl mb-4">
                Spy Hike Portal Ecosystem
              </motion.h2>
              <motion.p variants={staggerItem} className="text-zinc-600 dark:text-elegant-text/75">
                Our application features separate sandboxes representing key roles in the adventure marketplace. Try out each layout.
              </motion.p>
            </motion.div>

            <motion.div 
              {...scrollTriggerSettings}
              variants={staggerContainer}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
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

        {/* 6. TESTIMONIALS WITH CASCADING ENTRY */}
        <section id="testimonials" className="w-full py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            {...scrollTriggerSettings}
            variants={staggerContainer}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.h2 variants={staggerItem} className="font-display font-bold text-3xl sm:text-4xl mb-4">
              Loved by Outdoor Trekkers
            </motion.h2>
            <motion.p variants={staggerItem} className="text-zinc-600 dark:text-elegant-text/75">
              Here is what genuine outdoor lovers have to say about booking high-altitude passes and coordinates.
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

        {/* 7. FAQ ACCORDION WITH SLIDING DRAWER & CARET ANIMATION */}
        <section id="faq" className="w-full border-t border-zinc-200 dark:border-elegant-border/80 py-24 bg-[#EDE6D4]/50 dark:bg-elegant-card/10 transition-colors duration-300">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-zinc-600 dark:text-elegant-text/75">
                Have questions? We have compiled standard logistical queries for your review.
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

        {/* FOOTER */}
        <footer className="w-full border-t border-zinc-200 dark:border-elegant-border bg-[#F6F1E5] dark:bg-elegant-bg transition-colors duration-300 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={onLaunchApp}>
              <div className="w-9 h-9 rounded-lg bg-forest-500 dark:bg-elegant-green flex items-center justify-center shadow-lg shadow-forest-500/25">
                <Compass className="w-5.5 h-5.5 text-white" />
              </div>
              <span className="font-display font-black text-xl tracking-tight bg-gradient-to-r from-forest-700 via-forest-500 to-spy-orange dark:from-white dark:to-elegant-text bg-clip-text text-transparent">
                Spy Hike
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              <a href="#features" className="hover:text-spy-orange">Features</a>
              <a href="#expeditions" className="hover:text-spy-orange">Expeditions</a>
              <a href="#gateways" className="hover:text-spy-orange">Portals</a>
              <a href="#testimonials" className="hover:text-spy-orange">Reviews</a>
            </div>

            <div className="text-center md:text-right">
              <span className="text-[11px] text-zinc-400 block mb-1">
                © 2026 Spy Hike. Built with React 19, Tailwind v4 & Motion v12.
              </span>
              <span className="text-[10px] text-zinc-400/60 block">
                All coordinates, safety logs, and agencies are simulated for demo compliance.
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
