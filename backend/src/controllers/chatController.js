import Chat from '../models/Chat.js';
import Trip from '../models/Trip.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Finds or creates the (trip, customer, organizer) thread. Used on booking to
// seed a welcome message, and when either side first messages.
export async function findOrCreateChat({ trip, userEmail, userName }) {
  let chat = await Chat.findOne({ tripId: trip._id, userEmail, organizerEmail: trip.organizerEmail });
  if (!chat) {
    chat = await Chat.create({
      tripId: trip._id,
      tripName: trip.name,
      userEmail,
      userName,
      organizerEmail: trip.organizerEmail,
      organizerName: trip.organizer?.name,
      organizerAvatar: trip.organizer?.avatar,
      messages: [],
    });
  }
  return chat;
}

// ─── Customer ────────────────────────────────────────────────────────────────

export const listCustomerChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ userEmail: req.user.email }).sort({ updatedAt: -1 });
  res.json({ chats: chats.map((c) => c.toPublicJSON()) });
});

// POST /chats/:tripId/messages { text } — customer sends a message (creating
// the thread if needed).
export const sendCustomerMessage = asyncHandler(async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) throw ApiError.badRequest('Message text is required');
  const trip = await Trip.findById(req.params.tripId);
  if (!trip) throw ApiError.notFound('Trip not found');
  const user = await User.findById(req.user.sub);

  const chat = await findOrCreateChat({ trip, userEmail: req.user.email, userName: user?.name });
  chat.messages.push({ sender: 'user', text, timestamp: new Date() });
  await chat.save();
  res.status(201).json({ chat: chat.toPublicJSON() });
});

// ─── Organizer ───────────────────────────────────────────────────────────────

export const listOrganizerChats = asyncHandler(async (req, res) => {
  const chats = await Chat.find({ organizerEmail: req.organizer.email }).sort({ updatedAt: -1 });
  res.json({ chats: chats.map((c) => c.toPublicJSON()) });
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
  res.json({ chat: chat.toPublicJSON() });
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
  }
  res.json({ chat: chat.toPublicJSON() });
});
