import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MapPin, Star, Sparkles, Trash2 } from 'lucide-react';

export default function WishlistView({
  wishlist,
  trips,
  onToggleWishlist,
  onSelectTrip,
  onTriggerBooking,
  darkMode
}) {
  
  // Cross matching
  const savedTrips = trips.filter(t => wishlist.includes(t.id));

  return (
    <div className={`flex-1 font-sans w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 md:pb-16 ${
      darkMode ? 'bg-transparent text-elegant-text' : 'bg-transparent text-zinc-900'
    }`}>

      {/* Header */}
      <div className="pt-6">
        <h1 className="font-serif text-4xl font-medium tracking-tight">Wishlist</h1>
        <p className={`text-sm mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Your saved bucket-list adventures</p>
      </div>

      {/* Saved treks */}
      <div className="mt-6">
        <AnimatePresence mode="popLayout">
          {savedTrips.length === 0 ? (
            <motion.div
              key="empty-wishlist"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-24"
            >
              <Heart size={44} className={`mx-auto ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`} />
              <h3 className="font-serif text-2xl font-semibold mt-4">Wishlist is empty</h3>
              <p className={`text-sm mt-2 max-w-xs mx-auto leading-relaxed ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Tap the heart on any trek to save it here for later.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedTrips.map(trip => (
                <motion.div
                  key={trip.id}
                  id={`wishlist-item-card-${trip.id}`}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  whileHover={{ y: -3 }}
                  className={`rounded-3xl overflow-hidden p-3 flex gap-3.5 shadow-md ${darkMode ? 'bg-elegant-card' : 'bg-white'}`}
                >
                  {/* Cover */}
                  <div
                    onClick={() => onSelectTrip(trip)}
                    className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 relative cursor-pointer"
                  >
                    <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 text-zinc-700">
                      {trip.difficulty}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3
                          onClick={() => onSelectTrip(trip)}
                          className="font-serif text-lg font-semibold leading-tight truncate cursor-pointer"
                        >
                          {trip.name}
                        </h3>
                        <button
                          id={`btn-remove-wishlist-${trip.id}`}
                          onClick={() => onToggleWishlist(trip.id)}
                          className="text-rose-500 hover:text-rose-600 cursor-pointer p-1 active:scale-90 shrink-0"
                          title="Remove"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className={`text-xs flex items-center gap-1 mt-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        <MapPin size={12} className="text-spy-orange shrink-0" /> {trip.location}
                      </p>
                      <div className="flex items-center gap-1 text-xs font-bold mt-1.5">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        {trip.rating}
                        <span className={`ml-2 ${darkMode ? 'text-elegant-orange' : 'text-forest-600'}`}>₹{trip.price}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onTriggerBooking(trip)}
                      className={`self-start mt-2 text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-1.5 cursor-pointer active:scale-95 text-white ${
                        darkMode ? 'bg-elegant-green hover:bg-forest-600' : 'bg-forest-600 hover:bg-forest-700'
                      }`}
                    >
                      Book now <Sparkles size={13} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
