
const mongoose = require('mongoose');

class DatabaseTransaction {
  constructor() {
    this.session = null;
  }

  async startTransaction() {
    if (this.session) {
      throw new Error('Transaction already started');
    }
    
    this.session = await mongoose.startSession();
    this.session.startTransaction();
    return this.session;
  }

  async commitTransaction() {
    if (!this.session) {
      throw new Error('No active transaction to commit');
    }
    
    try {
      await this.session.commitTransaction();
    } finally {
      await this.session.endSession();
      this.session = null;
    }
  }

  async abortTransaction() {
    if (!this.session) {
      throw new Error('No active transaction to abort');
    }
    
    try {
      await this.session.abortTransaction();
    } finally {
      await this.session.endSession();
      this.session = null;
    }
  }

  getSession() {
    return this.session;
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

// Utility function for simple transaction wrapper
const withTransaction = async (operations) => {
  const transaction = new DatabaseTransaction();
  return await transaction.executeInTransaction(operations);
};

module.exports = {
  DatabaseTransaction,
  withTransaction
};
