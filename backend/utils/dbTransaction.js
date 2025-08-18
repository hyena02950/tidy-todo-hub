
const mongoose = require('mongoose');

class DatabaseTransaction {
  constructor() {
    this.session = null;
  }

  async startTransaction() {
    if (this.session) {
      throw new Error('Transaction already started');
    }
    
    // Check if replica set is available
    if (!global.hasReplicaSet) {
      console.log('ℹ️ Single-node MongoDB detected - skipping session for transaction');
      return null;
    }
    
    this.session = await mongoose.startSession();
    this.session.startTransaction();
    return this.session;
  }

  async commitTransaction() {
    if (!global.hasReplicaSet || !this.session) {
      return; // No transaction to commit in single-node setup
    }
    
    try {
      await this.session.commitTransaction();
    } finally {
      await this.session.endSession();
      this.session = null;
    }
  }

  async abortTransaction() {
    if (!global.hasReplicaSet || !this.session) {
      return; // No transaction to abort in single-node setup
    }
    
    try {
      await this.session.abortTransaction();
    } finally {
      await this.session.endSession();
      this.session = null;
    }
  }

  getSession() {
    return global.hasReplicaSet ? this.session : null;
  }

  async executeInTransaction(operations) {
    const session = await this.startTransaction();
    
    try {
      const result = await operations(session);
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.abortTransaction();
      throw error;
    }
  }
}

// Enhanced utility function for simple transaction wrapper
const withTransaction = async (operations) => {
  const transaction = new DatabaseTransaction();
  return await transaction.executeInTransaction(operations);
};

// Safe transaction wrapper that works with both replica sets and single-node
const safeTransaction = async (operations) => {
  if (!global.hasReplicaSet) {
    // For single-node, execute operations without transaction
    return await operations(null);
  }
  
  // For replica sets, use full transaction
  return await withTransaction(operations);
};

module.exports = {
  DatabaseTransaction,
  withTransaction,
  safeTransaction
};
