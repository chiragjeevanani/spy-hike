/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const CATEGORIES_LIST = [
  { id: 'Trekking', label: 'Trekking', icon: 'Mountain' },
  { id: 'Hiking', label: 'Hiking', icon: 'Compass' },
  { id: 'Camping', label: 'Camping', icon: 'Tent' },
  { id: 'Adventure Tours', label: 'Adventure Tours', icon: 'Flame' },
  { id: 'Nature Walks', label: 'Nature Walks', icon: 'Trees' },
  { id: 'Weekend Trips', label: 'Weekend Trips', icon: 'CalendarDays' },
];

export const PROMOTIONAL_BANNERS = [
  {
    id: 'promo-1',
    title: 'Himalayan Ridge Pass',
    subtitle: 'Conquer the Snow Peaks',
    tag: 'Trending Adventure',
    discount: 'Flat 20% Off',
    code: 'SPYHIKE20',
    img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    tripId: 'himalayan-ridge-pass-trek'
  },
  {
    id: 'promo-2',
    title: 'Valley of Flowers',
    subtitle: 'Uttarakhand Monsoon Special',
    tag: 'Monsoon Trail',
    discount: 'Save ₹50',
    code: 'VALLEY50',
    img: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
    tripId: 'valley-of-flowers-trek'
  },
  {
    id: 'promo-3',
    title: 'Western Ghats Monsoon',
    subtitle: 'Weekend Refresh',
    tag: 'Lush Green Escape',
    discount: '15% Off Group Bookings',
    code: 'GHATS15',
    img: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80',
    tripId: 'western-ghats-monsoon-trail'
  }
];

export const TRENDING_DESTINATIONS = [
  { id: 'dest-1', name: 'Leh Ladakh', state: 'Jammu & Kashmir', hikes: 14, img: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=400&q=80' },
  { id: 'dest-2', name: 'Coorg Coffee Estates', state: 'Karnataka', hikes: 8, img: 'https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?auto=format&fit=crop&w=400&q=80' },
  { id: 'dest-3', name: 'Valley of Flowers', state: 'Uttarakhand', hikes: 6, img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80' },
  { id: 'dest-4', name: 'Western Ghats', state: 'Maharashtra', hikes: 12, img: 'https://images.unsplash.com/photo-1500627869374-13cd993b1115?auto=format&fit=crop&w=400&q=80' },
];

export const HIKING_TRIPS = [
  {
    id: 'himalayan-ridge-pass-trek',
    name: 'Himalayan Ridge Pass Trek',
    location: 'Kasol, Parvati Valley',
    state: 'Himachal Pradesh',
    city: 'Kasol',
    rating: 4.9,
    reviewsCount: 142,
    price: 349,
    difficulty: 'Difficult',
    durationDays: 7,
    availableSeats: 6,
    totalSeats: 15,
    category: 'Trekking',
    featured: true,
    coverImage: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1520201163981-8cc95007dd2a?auto=format&fit=crop&w=600&q=80'
    ],
    organizer: {
      name: 'Himalayan Sherpa Guides',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      rating: 4.95,
      verified: true
    },
    description: 'Conquer the breathtaking elevation of Parvati Valley. Experience crisp alpine breeze, freezing high-altitude lakes, and dense pine forests that lead to spectacular snow-capped viewing points. This is an epic 7-day challenge suited for hikers ready to push their boundaries and touch high Himalayan horizons.',
    highlights: [
      'Acclimatization hikes around classic Parvati Valley viewpoints',
      'Camping in high-grade geodesic domes under crystal-clear starry nights',
      'Technical glacial pass crossing guided by mountaineering veterans',
      'Warm traditional meals cooked by local Sherpas at standard rest tents'
    ],
    distanceKm: 54,
    elevationMeters: 4200,
    maxGroupSize: 15,
    itinerary: [
      { day: 1, title: 'Arrival & Base Camp Kasol', description: 'Briefing by the expedition lead, material checklist verification, and short light walk around Parvati river to adapt to altitude.' },
      { day: 2, title: 'Trek to Kheerganga Wilderness', description: 'Trek through alpine valleys, rushing waterfalls, and geothermal hot springs of historic Kheerganga.' },
      { day: 3, title: 'Ascent to Tunda Bhuj Camp', description: 'A dramatic climb passing deep gorges with views of roaring waterfalls and mighty pine structures.' },
      { day: 4, title: 'Ridge High Glacial Base Camp', description: 'Climb onto the high alpine ridges, feeling the vegetation yield to cold, wild grey and white horizons.' },
      { day: 5, title: 'Pass Conquest & Summit Ridge', description: 'Pre-dawn departure to conquer the High Ridge Pass, witnessing a pristine 360-degree Himalayan sunrise.' },
      { day: 6, title: 'Descent to Wilderness Fields', description: 'A smooth downhill journey traversing dynamic scree, high alpine meadows, and warm shelter huts.' },
      { day: 7, title: 'Return Journey to Kasol Base', description: 'Concluding the epic trek. Distribution of formal certificate of completion and transport drop-off.' }
    ],
    included: [
      'Certified Wilderness First Responder Guide',
      'All forest entry permits, environmental fees and state regulatory permissions',
      'Premium expedition tents and warm sub-zero sleeping bags',
      'Hot local buffet meals (Breakfast, Lunch, Dinner and high-alt snacks)'
    ],
    notIncluded: [
      'Personal emergency evacuation or high-risk medical insurance costs',
      'Porters/Mules to carry personal baggage (can be pre-rented on side)',
      'Specific personal protective gear (trekking poles, premium boots, heavy down jackets)'
    ],
    safetyGuidelines: [
      'Maintain continuous dynamic communications with lead organizer',
      'Strict Zero-Litter eco compliance policy must be verified',
      'High physical preparation is mandatory; regular cardio exercises 2 weeks prior recommended'
    ],
    cancellationPolicy: [
      'Full refund if cancelled up to 15 days before the departure date',
      '50% refund dynamic penalty between 7 and 14 days prior',
      'No refunds allowed within 7 days because logistics and ration pre-allocation occur'
    ],
    faqs: [
      { question: 'What physical fitness level is required?', answer: 'An Advanced fitness level is strongly recommended. Regular running, core exercises, and legs workouts make the 54km trek comfortable.' },
      { question: 'Are toilets available during the high altitude trek?', answer: 'We set up eco-friendly dry toilet tents at every overnight camp site.' }
    ],
    reviews: [
      {
        id: 'rev-1',
        userName: 'Aarav Sharma',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'Absoluting mindblowing! The Sherpas were extremely supportive, and crossing the pass at dawn was a life-defining moment.',
        date: '2026-05-18'
      },
      {
        id: 'rev-2',
        userName: 'Priya Patel',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'A well-planned trip. Demanding, but the guide managed and paced our rhythm beautifully. Food was incredibly fresh and warm.',
        date: '2026-06-02'
      }
    ]
  },
  {
    id: 'valley-of-flowers-trek',
    name: 'Valley of Flowers Scenic Valley',
    location: 'Govindghat, Chamoli',
    state: 'Uttarakhand',
    city: 'Chamoli',
    rating: 4.8,
    reviewsCount: 98,
    price: 199,
    difficulty: 'Moderate',
    durationDays: 5,
    availableSeats: 12,
    totalSeats: 20,
    category: 'Hiking',
    featured: true,
    coverImage: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80'
    ],
    organizer: {
      name: 'Uttarakhand Eco Travels',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      rating: 4.85,
      verified: true
    },
    description: 'Immerse yourself inside the UNESCO World Heritage site of Valley of Flowers. Famous for its meadows of endemic alpine flowers and diverse flora, this moderately challenging trek feels like stepping into a fairytale canvas.',
    highlights: [
      'Walk amidst thousands of wild orchid, poppy, marigold and lily meadows',
      'Beautiful campsite set up alongside the foaming Pushpawati river stream',
      'Holy high-altitude Hemkund Sahib peak trek extension with snowy lake views',
      'Certified local naturalist guide to explain mountain flora'
    ],
    distanceKm: 38,
    elevationMeters: 3600,
    maxGroupSize: 20,
    itinerary: [
      { day: 1, title: 'Dehradun to Govindghat Base', description: 'Scenic mountain drive from Dehradun along dynamic Alaknanda river views. Night stay at local eco resort.' },
      { day: 2, title: 'Trek Govindghat to Ghangaria Camp', description: 'Trek along winding paved paths through traditional mountain villages, waterfalls, and mist-covered views.' },
      { day: 3, title: 'Day inside Valley of Flowers', description: 'Enter the absolute flower heaven. Explore winding trails of wild blossoms flanked by towering cold fog cliffs.' },
      { day: 4, title: 'Pilgrim climb to Hemkund Sahib', description: 'Climb a steep path to the holy lake Hemkund, located at 4100m. Witness rare Brahma Kamal flora and snowy waters.' },
      { day: 5, title: 'Return Govindghat & Drive back', description: 'Descent trek back to Govindghat base and return mountain taxi transfer to Dehradun. Tour concludes.' }
    ],
    included: [
      'All local inner-line permits and wildlife entry tickets',
      'Accommodations in standard guesthouse & alpine base camps',
      'Expert naturalist guide specializing in local mountain orchids',
      'All vegetarian meals from base back to base'
    ],
    notIncluded: [
      'Pony hire or chopper shuttle services (for individual transit)',
      'Personal dynamic medication and outdoor rain suits',
      'Tips for guide and camp cooks'
    ],
    safetyGuidelines: [
      'Strictly avoid plucking flowers or littering; respect nature rules',
      'Prepare for sudden mid-mountain showers with adequate waterproof backpacks'
    ],
    cancellationPolicy: [
      'Full refund up to 7 days prior',
      'No refund within 7 days of the booking start'
    ],
    faqs: [
      { question: 'When is the flowers blooming peak?', answer: 'July to September is the perfect blooming season under the refreshing monsoon mist.' }
    ],
    reviews: [
      {
        id: 'v-rev-1',
        userName: 'Rohan Mehra',
        userAvatar: 'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'Unbelievably gorgeous. The entire valley is covered with a colorful sheet of wildflowers. Hemkund climb is demanding but highly holy!',
        date: '2026-06-10'
      }
    ]
  },
  {
    id: 'western-ghats-monsoon-trail',
    name: 'Western Ghats Monsoon Trail',
    location: 'Lonavala, Maharashtra',
    state: 'Maharashtra',
    city: 'Lonavala',
    rating: 4.7,
    reviewsCount: 76,
    price: 89,
    difficulty: 'Easy',
    durationDays: 2,
    availableSeats: 15,
    totalSeats: 25,
    category: 'Weekend Trips',
    featured: true,
    coverImage: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1500627869374-13cd993b1115?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=600&q=80'
    ],
    organizer: {
      name: 'Sahyadri Rangers',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
      rating: 4.65,
      verified: false
    },
    description: 'Breathe in the lush monsoon beauty of the Sahyadris. Wind through misty mountain trails, ancient stone fortresses, and roaring waterfalls of Lonavala. This 2-day weekend escape is perfectly crafted for beginners and city dwellers seeking nature healing.',
    highlights: [
      'Trek through historic Rajmachi Fort overlooking foggy mountain gorges',
      'Indulge in delicious local Maharashtrian village food and hot piping tea',
      'Refreshing natural waterfall bath sessions under safe organizer supervision',
      'Evening acoustic campfire with customized high-grade weatherproof shelter tents'
    ],
    distanceKm: 14,
    elevationMeters: 800,
    maxGroupSize: 25,
    itinerary: [
      { day: 1, title: 'Scenic Hiking from base to Rajmachi Village', description: 'Start the lush mud trail under gentle rain. Traverse fresh paddy fields, misty trees and cross streaming tributaries.' },
      { day: 2, title: 'Fort Conquest & Descent', description: 'Wake up to thick clouds inside the camp. Summit the historical stone tower for misty view of valleys and return.' }
    ],
    included: [
      'Experienced Sahyadri guides fluent in Marathi, Hindi and English',
      'Cozy shared weather tents with cushioned mats',
      'Refreshing morning breakfast Poha, Lunch (village style thali) and Dinner'
    ],
    notIncluded: [
      'Personal transport to the hiking start base point',
      'Trekking poles or premium waterproof ponchos'
    ],
    safetyGuidelines: [
      'Stay away from steep cliff edges as they get slippery during heavy downpours',
      'Avoid high-velocity river streams unless pointed out safe by our guides'
    ],
    cancellationPolicy: [
      'Flexible booking policy: Full refund if cancelled up to 48 hours prior to start'
    ],
    faqs: [
      { question: 'Is it suitable for solo female travelers?', answer: 'Absolutely. We ensure verified guides and dedicated girls tents for absolute comfort and safety.' }
    ],
    reviews: [
      {
        id: 'wg-rev-1',
        userName: 'Siddharth Roy',
        userAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
        rating: 4.5,
        comment: 'Amazing village food! Very friendly environment and easy walk. Perfect for relaxing and clicking misty green photos.',
        date: '2026-06-15'
      }
    ]
  },
  {
    id: 'stargazing-desert-camp',
    name: 'Stargazing Desert Camp & Trek',
    location: 'Thar Desert, Jaisalmer',
    state: 'Rajasthan',
    city: 'Jaisalmer',
    rating: 4.6,
    reviewsCount: 45,
    price: 129,
    difficulty: 'Easy',
    durationDays: 3,
    availableSeats: 8,
    totalSeats: 15,
    category: 'Camping',
    coverImage: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80'
    ],
    organizer: {
      name: 'Desert Nomad Adventures',
      avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
      rating: 4.8,
      verified: true
    },
    description: 'Experience the magic of cold desert nights. Trek along low sand dunes, witness orange glowing sunsets, and spend the night in premium open-air tents gazing at the Milky Way galaxy wheeling above you.',
    highlights: [
      'Sunset dune hikes and authentic camel caravan ride experiences',
      'Live Rajasthani music and folk acts around crackling fire wood',
      'Guided amateur astronomy session with a professional, high-end telescope',
      'Folk-style desert camping with local, delicious delicacies'
    ],
    distanceKm: 12,
    elevationMeters: 200,
    maxGroupSize: 15,
    itinerary: [
      { day: 1, title: 'Arrival at Dunes Base & Camel Transit', description: 'Drive into Jaisalmer base, ride friendly camel transit into deep dunes, set up the base camps under an orange sky.' },
      { day: 2, title: 'Sand Dune Walk & Stargazing Gala', description: 'Learn sand dune path traversal, check out desert flora, and gather around the campsite for guided dynamic galaxy viewing.',
      },
      { day: 3, title: 'Dawn Golden Sunrise & Check out', description: 'Click beautiful sunrise silhouettes over Jaisalmer dunes, eat warm local breakfast and back to town.' }
    ],
    included: [
      'Astronomy expert with high-end computerized telescope locator',
      'Glamping tents with cozy bedding and traditional setups',
      'Water bottles and local organic desert dynamic meals'
    ],
    notIncluded: [
      'Personal high-power professional binoculars or cameras',
      'Alcoholic beverages or packaged energy drinks'
    ],
    safetyGuidelines: [
      'Dress in loose linens for daytime, warm layers are critical for cold desert nights'
    ],
    cancellationPolicy: [
      '75% refund if cancelled up to 5 days beforehand'
    ],
    faqs: [
      { question: 'Will there be regular cellular network coverage?', answer: 'Dune camps have extremely limited signal, offering an absolute opportunity to digitally detox!' }
    ],
    reviews: [
      {
        id: 'dc-rev-1',
        userName: 'Tanmay Goel',
        userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'Telescope starry view was breathtaking. We literally saw Saturn rings! Camp was very comfortable and authentic.',
        date: '2026-05-29'
      }
    ]
  },
  {
    id: 'coorg-coffee-estate-walk',
    name: 'Coorg Coffee Estate Walking Tour',
    location: 'Madikeri, Coorg',
    state: 'Karnataka',
    city: 'Coorg',
    rating: 4.9,
    reviewsCount: 34,
    price: 49,
    difficulty: 'Easy',
    durationDays: 1,
    availableSeats: 20,
    totalSeats: 30,
    category: 'Nature Walks',
    coverImage: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1590001155093-a3c66ab0c3ff?auto=format&fit=crop&w=600&q=80'
    ],
    organizer: {
      name: 'Coorg Heritage Walks',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      rating: 4.9,
      verified: true
    },
    description: 'Stroll under majestic foggy shade-grown coffee canopies. Feel the rich aroma of roasted beans, wild cardamom spikes and lush green vanilla creepers. Perfect 1-day relaxation with organic Coorg farm-to-cup brewing guides.',
    highlights: [
      'Gourmet roasted coffee bean tasting with expert brewer',
      'Learn detailed spice farming processes like pepper and cardamoms',
      'Traditional Kodava style lunch served on fresh plantain leaves',
      'Bird-watching trail targeting colorful Malabar Hornbills and blue parakeets'
    ],
    distanceKm: 8,
    elevationMeters: 150,
    maxGroupSize: 30,
    itinerary: [
      { day: 1, title: 'Aromatic walking & Spice tasting thali', description: 'Start walking at 9 AM, traverse spice hills, eat Kodava lunch, gather around for bean roasting demo.' }
    ],
    included: [
      'Specialist private estate walk permits',
      'Farm fresh coffee samples and complete heavy lunch',
      'Tasting guidelines certificate'
    ],
    notIncluded: [
      'Transit back to hotels'
    ],
    safetyGuidelines: [
      'Wear covered sports shoes or tracking boots to protect against minor forest leeches'
    ],
    cancellationPolicy: [
      '100% refund up to 24 hours prior'
    ],
    faqs: [
      { question: 'Is this kid friendly?', answer: 'Yes, it is extremely popular with families. Pathways are wide, flat, and highly safe.' }
    ],
    reviews: [
      {
        id: 'cc-rev-1',
        userName: 'Meera Nair',
        userAvatar: 'https://images.unsplash.com/photo-1534751516642-a131ffd473fd?auto=format&fit=crop&w=150&q=80',
        rating: 5,
        comment: 'Pure coffee bliss! Bought high-grade organic coffee on-site. The host family treated us with incredible warmth.',
        date: '2026-06-19'
      }
    ]
  },
  {
    id: 'kudremukh-peak-challenge',
    name: 'Kudremukh Peak Challenge Peak',
    location: 'Chikmagalur',
    state: 'Karnataka',
    city: 'Chikmagalur',
    rating: 4.8,
    reviewsCount: 112,
    price: 159,
    difficulty: 'Moderate',
    durationDays: 3,
    availableSeats: 4,
    totalSeats: 16,
    category: 'Adventure Tours',
    coverImage: 'https://images.unsplash.com/photo-1472214222541-d510753a49fa?auto=format&fit=crop&w=1000&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1472214222541-d510753a49fa?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1500627869374-13cd993b1115?auto=format&fit=crop&w=600&q=80'
    ],
    organizer: {
      name: 'Western Ghats Trekking Club',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
      rating: 4.75,
      verified: true
    },
    description: 'Summit the Kudremukh Peak, famed for its distinct horse-face shape and steep alpine tropical grasslands. Walk along continuous rolling green ridges, deep cloudy valleys and rich tropical Shola forests.',
    highlights: [
      'Deep tropical Shola shola forests trail crossing streaming waterfalls',
      'Witness stunning viewpoints of rolling green ridges shaped like heavy waves',
      'Official forest department certified local guides',
      'Comfortable homestay accommodation and local Chikmagalur filter coffee'
    ],
    distanceKm: 22,
    elevationMeters: 1894,
    maxGroupSize: 16,
    itinerary: [
      { day: 1, title: 'Chikmagalur to Mullodi Base', description: 'Pickup and drive to Mullodi base on 4wd jeeps. Acclimatization briefing.' },
      { day: 2, title: 'Kudremukh Summit Day Hike', description: 'Early morning climb. Conquer continuous green ridges under strong cloud cover. Return to homestay.' },
      { day: 3, title: 'Somawathy Waterfalls & Return', description: 'Visit safe local Somawathy waterfall streams and return drive to town.' }
    ],
    included: [
      'Homestay sharing rooms with warm food',
      'State forest department guide and entry permit charges included',
      '4WD mountain jeep transport to trek baseline point'
    ],
    notIncluded: [
      'Personal outdoor rain shields or heavy backpacks'
    ],
    safetyGuidelines: [
      'Plastics of any kind are heavily banned by forest authorities. Expect bag checks at the checkpoint'
    ],
    cancellationPolicy: [
      'Full refund up to 4 days prior'
    ],
    faqs: [
      { question: 'Is medical assistance present?', answer: 'Our core guides are certified in Wilderness First Aid and carry oxygen and complete medical kits.' }
    ],
    reviews: [
      {
        id: 'km-rev-1',
        userName: 'Vikram Seth',
        userAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
        rating: 4.8,
        comment: 'Green rolling hills did look like an ocean of grass! Demanding ridge walk, but incredibly peaceful.',
        date: '2026-06-08'
      }
    ]
  }
];
