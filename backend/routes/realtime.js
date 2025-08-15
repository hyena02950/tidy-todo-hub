
const express = require('express');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const realtimeService = require('../services/realtimeService');

const router = express.Router();

// WebSocket upgrade handler
const handleWebSocketUpgrade = async (request, socket, head, wss) => {
  try {
    // Extract token from query string or headers
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token') || request.headers.authorization?.split(' ')[1];

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Upgrade to WebSocket
    wss.handleUpgrade(request, socket, head, (ws) => {
      // Extract vendor ID if user is a vendor
      const vendorRole = user.roles.find(role => 
        ['vendor_admin', 'vendor_recruiter'].includes(role.role)
      );
      const vendorId = vendorRole?.vendorId?.toString();

      // Add connection to realtime service
      realtimeService.addConnection(user._id.toString(), ws, user.roles, vendorId);

      // Send connection confirmation
      ws.send(JSON.stringify({
        event: 'connected',
        data: {
          userId: user._id,
          timestamp: new Date()
        }
      }));

      console.log(`WebSocket connection established for user: ${user.email}`);
    });
  } catch (error) {
    console.error('WebSocket upgrade error:', error);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
  }
};

// REST endpoint to get connection stats (for debugging)
router.get('/stats', async (req, res) => {
  try {
    const stats = realtimeService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting realtime stats:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to get realtime stats'
    });
  }
});

module.exports = { router, handleWebSocketUpgrade };
