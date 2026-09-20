import Chat from '../models/Chat.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import { notifyCustomer, notifyOrganizer } from '../services/notificationService.js';
import { emitToChat, emitToUser } from '../lib/socket.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Finds or creates the (trip, customer, organizer) thread. Used on booking to
// seed a welcome message, and when either side first messages.
export async function findOrCreateChat({ trip, userEmail, userName, userAvatar }) {
  let chat = await Chat.findOne({ tripId: trip._id, userEmail, organizerEmail: trip.organizerEmail });

  // Resolve real organizer avatar and name
  let organizerAvatar = trip.organizer?.avatar || '';
  let organizerName = trip.organizer?.name || '';
  if (!organizerAvatar || !organizerName) {
    const orgUser = await User.findOne({ email: trip.organizerEmail }).select('name avatar organizer.agencyName');
    if (orgUser) {
      organizerAvatar = organizerAvatar || orgUser.avatar || '';
      organizerName = organizerName || orgUser.organizer?.agencyName || orgUser.name || 'Organizer';
    }
  }

  if (!chat) {
    chat = await Chat.create({
      tripId: trip._id,
      tripName: trip.name,
      userEmail,
      userName: userName || userEmail,
      userAvatar: userAvatar || '',
      organizerEmail: trip.organizerEmail,
      organizerName: organizerName || 'Organizer',
      organizerAvatar: organizerAvatar || '',
      messages: [],
    });
  } else {
    let dirty = false;
    if (userName && chat.userName !== userName) {
      chat.userName = userName;
      dirty = true;
    }
    if (userAvatar && chat.userAvatar !== userAvatar) {
      chat.userAvatar = userAvatar;
      dirty = true;
    }
    if (organizerName && chat.organizerName !== organizerName) {
      chat.organizerName = organizerName;
      dirty = true;
    }
    if (organizerAvatar && chat.organizerAvatar !== organizerAvatar) {
      chat.organizerAvatar = organizerAvatar;
      dirty = true;
    }
    if (dirty) {
      await chat.save();
    }
  }
  return chat;
}

// ─── Customer ────────────────────────────────────────────────────────────────

export const listCustomerChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ userEmail: req.user.email }).sort({ updatedAt: -1 });
  const organizerEmails = [...new Set(chats.map((c) => c.organizerEmail))];
  const orgUsers = await User.find({ email: { $in: organizerEmails } }).select('email name avatar organizer.agencyName');
  const orgMap = new Map(orgUsers.map((u) => [u.email, u]));

  res.json({
    chats: chats.map((c) => {
      const org = orgMap.get(c.organizerEmail);
      const organizerAvatar = c.organizerAvatar || org?.avatar || '';
      const organizerName = c.organizerName || org?.organizer?.agencyName || org?.name || 'Organizer';
      return c.toPublicJSON({ organizerAvatar, organizerName });
    }),
  });
});

// GET /chats/:tripId — returns the chat session for this trip and customer,
// finding or creating it with welcome greeting if not existing yet.
export const getCustomerTripChat = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  if (!trip) throw ApiError.notFound('Trip not found');
  const user = await User.findById(req.user.sub);

  const chat = await findOrCreateChat({
    trip,
    userEmail: req.user.email,
    userName: user?.name,
    userAvatar: user?.avatar,
  });

  const orgUser = await User.findOne({ email: chat.organizerEmail }).select('name avatar organizer.agencyName');
  const organizerAvatar = chat.organizerAvatar || orgUser?.avatar || '';
  const organizerName = chat.organizerName || orgUser?.organizer?.agencyName || orgUser?.name || 'Organizer';

  res.json({ chat: chat.toPublicJSON({ organizerAvatar, organizerName }) });
});

// POST /chats/:tripId/messages { text } — customer sends a message (creating
// the thread if needed).
export const sendCustomerMessage = asyncHandler(async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) throw ApiError.badRequest('Message text is required');
  const trip = await Trip.findById(req.params.tripId);
  if (!trip) throw ApiError.notFound('Trip not found');
  const user = await User.findById(req.user.sub);

  const chat = await findOrCreateChat({
    trip,
    userEmail: req.user.email,
    userName: user?.name,
    userAvatar: user?.avatar,
  });
  chat.messages.push({ sender: 'user', text, timestamp: new Date() });
  await chat.save();

  const publicChat = chat.toPublicJSON();
  const newMsg = chat.messages[chat.messages.length - 1];

  // Broadcast real-time WebSocket events immediately
  emitToChat(chat.tripId, 'new_message', { tripId: chat.tripId, chatId: chat._id.toString(), chat: publicChat, message: newMsg });
  emitToUser(chat.organizerEmail, 'chat_updated', { tripId: chat.tripId, chatId: chat._id.toString(), chat: publicChat });
  emitToUser(chat.userEmail, 'chat_updated', { tripId: chat.tripId, chatId: chat._id.toString(), chat: publicChat });

  // Trigger push notification to organizer with deep link
  const senderName = user?.name || chat.userName || 'A hiker';
  notifyOrganizer(chat.organizerEmail, {
    title: `Message from ${senderName}`,
    content: text.length > 80 ? `${text.slice(0, 77)}...` : text,
    type: 'Update',
    data: {
      type: 'chat',
      role: 'organizer',
      chatId: chat._id.toString(),
      tripId: chat.tripId,
      url: `/organizer?tab=chats&chatId=${chat._id.toString()}`,
    },
  }).catch((err) => console.error('[chat] push to organizer failed:', err?.message || err));

  res.status(201).json({ chat: chat.toPublicJSON() });
  res.status(201).json({ chat: publicChat });
});

// ─── Organizer ───────────────────────────────────────────────────────────────

export const listOrganizerChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ organizerEmail: req.organizer.email }).sort({ updatedAt: -1 });
  const userEmails = [...new Set(chats.map((c) => c.userEmail))];
  const hikers = await User.find({ email: { $in: userEmails } }).select('email name avatar');
  const hikerMap = new Map(hikers.map((u) => [u.email, u]));

  res.json({
    chats: chats.map((c) => {
      const hiker = hikerMap.get(c.userEmail);
      const userAvatar = c.userAvatar || hiker?.avatar || '';
      const userName = c.userName || hiker?.name || c.userEmail;
      return c.toPublicJSON({ userAvatar, userName });
    }),
  });
});

// POST /organizer/chats/:chatId/messages { text } — organizer replies.
export const sendOrganizerMessage = asyncHandler(async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) throw ApiError.badRequest('Message text is required');
  const chat = await Chat.findById(req.params.chatId);
  if (!chat) throw ApiError.notFound('Chat not found');
  if (chat.organizerEmail !== req.organizer.email) {
    throw ApiError.forbidden('This conversation belongs to another organizer');
  }
  chat.messages.push({ sender: 'organizer', text, timestamp: new Date() });
  await chat.save();

  const publicChat = chat.toPublicJSON();
  const newMsg = chat.messages[chat.messages.length - 1];

  // Broadcast real-time WebSocket events immediately
  emitToChat(chat.tripId, 'new_message', { tripId: chat.tripId, chatId: chat._id.toString(), chat: publicChat, message: newMsg });
  emitToUser(chat.userEmail, 'chat_updated', { tripId: chat.tripId, chatId: chat._id.toString(), chat: publicChat });
  emitToUser(chat.organizerEmail, 'chat_updated', { tripId: chat.tripId, chatId: chat._id.toString(), chat: publicChat });

  // Trigger push notification to customer with deep link
  const orgName = chat.organizerName || 'Trek Organizer';
  notifyCustomer(chat.userEmail, {
    title: `Message from ${orgName}`,
    content: text.length > 80 ? `${text.slice(0, 77)}...` : text,
    type: 'Update',
    data: {
      type: 'chat',
      role: 'hiker',
      chatId: chat._id.toString(),
      tripId: chat.tripId,
      url: `/app/bookings?chatTripId=${encodeURIComponent(chat.tripId)}`,
    },
  }).catch((err) => console.error('[chat] push to customer failed:', err?.message || err));

  res.json({ chat: chat.toPublicJSON() });
  res.json({ chat: publicChat });
});

export const markOrganizerChatRead = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  if (!chat) throw ApiError.notFound('Chat not found');
  if (chat.organizerEmail !== req.organizer.email) {
    throw ApiError.forbidden('This conversation belongs to another organizer');
  }
  let modified = false;
  chat.messages.forEach(m => {
    if (m.sender === 'user' && !m.read) {
      m.read = true;
      modified = true;
    }
  });
  if (modified) {
    await chat.save();
    emitToChat(chat.tripId, 'chat_read', { tripId: chat.tripId, chatId: chat._id.toString() });
  }
  res.json({ chat: chat.toPublicJSON() });
});

export const markCustomerChatRead = asyncHandler(async (req, res) => {
  const chat = await Chat.findOne({ tripId: req.params.tripId, userEmail: req.user.email });
  if (!chat) throw ApiError.notFound('Chat not found');
  let modified = false;
  chat.messages.forEach(m => {
    if (m.sender === 'organizer' && !m.read) {
      m.read = true;
      modified = true;
    }
  });
  if (modified) {
    await chat.save();
    emitToChat(chat.tripId, 'chat_read', { tripId: chat.tripId, chatId: chat._id.toString() });
  }
  res.json({ chat: chat.toPublicJSON() });
});
