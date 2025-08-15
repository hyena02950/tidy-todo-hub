
const EventEmitter = require('events');

class RealtimeService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // userId -> Set of connections
    this.vendorConnections = new Map(); // vendorId -> Set of connections
  }

  // Add a connection for a user
  addConnection(userId, connection, userRoles = [], vendorId = null) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId).add(connection);

    // If user is a vendor, also track by vendorId
    if (vendorId && ['vendor_admin', 'vendor_recruiter'].some(role => 
      userRoles.find(r => r.role === role))) {
      if (!this.vendorConnections.has(vendorId)) {
        this.vendorConnections.set(vendorId, new Set());
      }
      this.vendorConnections.get(vendorId).add(connection);
    }

    console.log(`User ${userId} connected to realtime service`);

    // Handle connection close
    connection.on('close', () => {
      this.removeConnection(userId, connection, vendorId);
    });

    connection.on('error', (error) => {
      console.error(`Connection error for user ${userId}:`, error);
      this.removeConnection(userId, connection, vendorId);
    });
  }

  // Remove a connection
  removeConnection(userId, connection, vendorId = null) {
    if (this.connections.has(userId)) {
      this.connections.get(userId).delete(connection);
      if (this.connections.get(userId).size === 0) {
        this.connections.delete(userId);
      }
    }

    if (vendorId && this.vendorConnections.has(vendorId)) {
      this.vendorConnections.get(vendorId).delete(connection);
      if (this.vendorConnections.get(vendorId).size === 0) {
        this.vendorConnections.delete(vendorId);
      }
    }

    console.log(`User ${userId} disconnected from realtime service`);
  }

  // Send message to specific user
  sendToUser(userId, event, data) {
    if (this.connections.has(userId)) {
      const connections = this.connections.get(userId);
      const message = JSON.stringify({ event, data, timestamp: new Date() });
      
      connections.forEach(connection => {
        if (connection.readyState === 1) { // WebSocket.OPEN
          try {
            connection.send(message);
          } catch (error) {
            console.error(`Failed to send message to user ${userId}:`, error);
            this.removeConnection(userId, connection);
          }
        }
      });
    }
  }

  // Send message to all admin users
  sendToAdmins(event, data) {
    const adminUserIds = Array.from(this.connections.keys());
    // In a real implementation, you'd filter by admin roles
    adminUserIds.forEach(userId => {
      this.sendToUser(userId, event, data);
    });
  }

  // Send message to vendor users
  sendToVendor(vendorId, event, data) {
    if (this.vendorConnections.has(vendorId)) {
      const connections = this.vendorConnections.get(vendorId);
      const message = JSON.stringify({ event, data, timestamp: new Date() });
      
      connections.forEach(connection => {
        if (connection.readyState === 1) { // WebSocket.OPEN
          try {
            connection.send(message);
          } catch (error) {
            console.error(`Failed to send message to vendor ${vendorId}:`, error);
          }
        }
      });
    }
  }

  // Notify about vendor status changes
  notifyVendorStatusChange(vendorId, status, updatedBy) {
    const data = {
      vendorId,
      status,
      updatedBy,
      updatedAt: new Date()
    };

    // Notify admins
    this.sendToAdmins('vendor_status_updated', data);
    
    // Notify the vendor
    this.sendToVendor(vendorId, 'status_updated', data);

    console.log(`Notified about vendor ${vendorId} status change to ${status}`);
  }

  // Notify about application status changes
  notifyApplicationStatusChange(vendorId, applicationId, status, reviewedBy, reviewNotes) {
    const data = {
      vendorId,
      applicationId,
      status,
      reviewedBy,
      reviewNotes,
      reviewedAt: new Date()
    };

    // Notify admins
    this.sendToAdmins('application_status_updated', data);
    
    // Notify the vendor
    this.sendToVendor(vendorId, 'application_status_updated', data);

    console.log(`Notified about application ${applicationId} status change to ${status}`);
  }

  // Notify about new user registration
  notifyNewUserRegistration(user) {
    const data = {
      userId: user.id || user._id,
      email: user.email,
      roles: user.roles,
      registeredAt: new Date()
    };

    // Notify all admins about new user
    this.sendToAdmins('new_user_registered', data);

    console.log(`Notified admins about new user registration: ${user.email}`);
  }

  // Notify about new vendor registration
  notifyNewVendorRegistration(vendor, user) {
    const data = {
      vendorId: vendor._id,
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      userId: user.id || user._id,
      userEmail: user.email,
      registeredAt: new Date()
    };

    // Notify all admins about new vendor
    this.sendToAdmins('new_vendor_registered', data);

    console.log(`Notified admins about new vendor registration: ${vendor.name}`);
  }

  // Get connection stats
  getStats() {
    return {
      totalConnections: Array.from(this.connections.values()).reduce((sum, set) => sum + set.size, 0),
      connectedUsers: this.connections.size,
      connectedVendors: this.vendorConnections.size
    };
  }
}

// Create singleton instance
const realtimeService = new RealtimeService();

module.exports = realtimeService;
