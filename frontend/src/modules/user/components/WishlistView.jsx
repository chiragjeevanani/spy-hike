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
    <div className={`flex-1 flex flex-col overflow-hidden font-sans ${
      darkMode ? 'bg-elegant-app text-elegant-text' : 'bg-transparent text-zinc-900'
    }`}>
      
      {/* Header */}
      <div className={`p-4 border-b shrink-0 ${
        darkMode ? 'bg-elegant-app border-white/5' : 'bg-white border-gray-100'
      }`}>
        <h2 className="text-sm uppercase font-mono font-black tracking-widest text-forest-600 dark:text-forest-400">
          SAVED EXPEDITIONS WISHLIST
        </h2>
        <p className="text-[10px] text-zinc-500 mt-1">
          Review your upcoming bucket-list adventures
        </p>
      </div>

      {/* Main Stream Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3">
        
        <AnimatePresence mode="popLayout">
          {savedTrips.length === 0 ? (
            <motion.div 
              key="empty-wishlist"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <span className="text-4xl block">🖤</span>
              <h3 className="text-sm font-display font-black mt-3">Wishlist is Empty</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                Tap the hearts on popular peaks or monsoons exploration listings to save them here.
              </p>
            </motion.div>
          ) : (
            savedTrips.map(trip => (
              <motion.div
                key={trip.id}
                id={`wishlist-item-card-${trip.id}`}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                whileHover={{ y: -2 }}
                className={`rounded-xl overflow-hidden p-2.5 flex gap-2.5 relative shadow-xs hover:shadow-sm transition duration-200 group ${
                  darkMode ? 'bg-elegant-card' : 'bg-white'
                }`}
              >
                
                {/* Image box cursor action */}
                <div 
                  onClick={() => onSelectTrip(trip)}
                  className="w-16 h-16 rounded-lg overflow-hidden shrink-0 relative bg-zinc-800 cursor-pointer"
                >
                  <img src={trip.coverImage} alt={trip.name} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0.5 left-0.5 hover:border-forest-500 font-mono text-[7px] font-bold uppercase px-1 py-0.2 bg-black/60 text-white rounded-xs">
                    {trip.difficulty}
                  </span>
                </div>

                {/* Detail block */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <h4 
                        onClick={() => onSelectTrip(trip)}
                        className="text-[11px] font-display font-extrabold truncate cursor-pointer hover:text-forest-405"
                      >
                        {trip.name}
                      </h4>
                      
                      {/* Delete item trash button */}
                      <button
                        id={`btn-remove-wishlist-${trip.id}`}
                        onClick={() => onToggleWishlist(trip.id)}
                        className="text-rose-500 hover:text-rose-600 cursor-pointer p-0.5 active:scale-90"
                        title="Remove item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    <p className="text-[9px] text-zinc-500 truncate flex items-center gap-0.5">
                      <MapPin size={8} /> {trip.location}
                    </p>
                  </div>

                  <div className={`flex items-center justify-between mt-1.5 pt-1.5 border-t ${
                    darkMode ? 'border-white/5' : 'border-zinc-100'
                  }`}>
                    <div className="flex items-center gap-1">
                      <Star size={9} className="fill-amber-400 text-amber-400" />
                      <span className="text-[9px] font-bold">{trip.rating}</span>
                      <span className={`text-[11px] font-sans font-black block ml-1 ${
                        darkMode ? 'text-[#F27D26]' : 'text-emerald-700'
                      }`}>₹{trip.price}</span>
                    </div>

                    <button
                      onClick={() => onTriggerBooking(trip)}
                      className={`text-[8px] uppercase font-black px-2.5 py-1 rounded-md flex items-center gap-0.5 cursor-pointer active:scale-95 ${
                        darkMode ? 'bg-elegant-green hover:bg-forest-650' : 'bg-forest-600 hover:bg-forest-700 text-white'
                      }`}
                    >
                      Hold Seat <Sparkles size={9} />
                    </button>
                  </div>
                </div>

              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
