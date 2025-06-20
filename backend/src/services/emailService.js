// backend/src/services/emailService.js
const nodemailer = require('nodemailer');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { promisify } = require('util');

class EmailService {
  async processCommand(command, integration, agent) {
    const credentials = integration.credentials;
    
    // Parse the command
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('check') && lowerCommand.includes('unread')) {
      return await this.checkUnreadEmails(credentials);
    }
    
    if (lowerCommand.includes('search')) {
      const searchTerm = this.extractSearchTerm(command);
      return await this.searchEmails(credentials, searchTerm);
    }
    
    if (lowerCommand.includes('send')) {
      return await this.sendEmail(credentials, command);
    }
    
    if (lowerCommand.includes('mark') && lowerCommand.includes('read')) {
      return await this.markAllAsRead(credentials);
    }
    
    return {
      message: "I can help you with: checking unread emails, searching emails, sending emails, or marking emails as read.",
      suggestions: [
        "Check my unread emails",
        "Search for emails from last week",
        "Send an email to someone@example.com",
        "Mark all unread emails as read"
      ]
    };
  }

  async checkUnreadEmails(credentials) {
    try {
      const emails = await this.fetchEmails(credentials, ['UNSEEN'], 10);
      
      if (emails.length === 0) {
        return { message: "You have no unread emails." };
      }
      
      return {
        message: `You have ${emails.length} unread email${emails.length > 1 ? 's' : ''}.`,
        emails: emails.map(email => ({
          from: email.from,
          subject: email.subject,
          date: email.date,
          preview: email.preview
        }))
      };
    } catch (error) {
      console.error('Check unread error:', error);
      return { 
        error: true, 
        message: "Failed to check emails. Please verify your email integration settings." 
      };
    }
  }

  async searchEmails(credentials, searchTerm) {
    try {
      const searchCriteria = this.buildSearchCriteria(searchTerm);
      const emails = await this.fetchEmails(credentials, searchCriteria, 20);
      
      if (emails.length === 0) {
        return { message: `No emails found matching "${searchTerm}".` };
      }
      
      return {
        message: `Found ${emails.length} email${emails.length > 1 ? 's' : ''} matching "${searchTerm}".`,
        emails: emails.map(email => ({
          from: email.from,
          subject: email.subject,
          date: email.date,
          preview: email.preview
        }))
      };
    } catch (error) {
      console.error('Search error:', error);
      return { 
        error: true, 
        message: "Failed to search emails." 
      };
    }
  }

  async sendEmail(credentials, command) {
    try {
      // Extract email details from command
      const details = this.extractEmailDetails(command);
      
      if (!details.to) {
        return {
          error: true,
          message: "Please specify the recipient email address."
        };
      }
      
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: credentials.smtp_host || 'smtp.gmail.com',
        port: credentials.smtp_port || 587,
        secure: false,
        auth: {
          user: credentials.email,
          pass: credentials.password
        }
      });
      
      // Send email
      await transporter.sendMail({
        from: credentials.email,
        to: details.to,
        subject: details.subject || 'No Subject',
        text: details.body || ''
      });
      
      return {
        message: `Email sent successfully to ${details.to}.`,
        details: {
          to: details.to,
          subject: details.subject,
          preview: details.body ? details.body.substring(0, 100) + '...' : ''
        }
      };
    } catch (error) {
      console.error('Send email error:', error);
      return {
        error: true,
        message: "Failed to send email. Please check the recipient address and try again."
      };
    }
  }

  async markAllAsRead(credentials) {
    try {
      const count = await this.markEmailsAsRead(credentials, ['UNSEEN']);
      
      return {
        message: count > 0 
          ? `Marked ${count} email${count > 1 ? 's' : ''} as read.`
          : "No unread emails to mark."
      };
    } catch (error) {
      console.error('Mark as read error:', error);
      return {
        error: true,
        message: "Failed to mark emails as read."
      };
    }
  }

  async fetchEmails(credentials, searchCriteria, limit = 10) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: credentials.email,
        password: credentials.password,
        host: credentials.imap_host || 'imap.gmail.com',
        port: credentials.imap_port || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });
      
      const emails = [];
      
      imap.once('error', reject);
      imap.once('end', () => resolve(emails));
      
      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }
          
          imap.search(searchCriteria, (err, results) => {
            if (err) {
              imap.end();
              return reject(err);
            }
            
            if (!results || results.length === 0) {
              imap.end();
              return;
            }
            
            // Limit results
            const fetch = imap.fetch(results.slice(-limit), {
              bodies: '',
              struct: true
            });
            
            fetch.on('message', (msg) => {
              const parser = simpleParser;
              let buffer = '';
              
              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
                
                stream.once('end', async () => {
                  try {
                    const parsed = await parser(buffer);
                    emails.push({
                      from: parsed.from?.text || '',
                      subject: parsed.subject || 'No Subject',
                      date: parsed.date || new Date(),
                      preview: parsed.text ? 
                        parsed.text.substring(0, 200).replace(/\s+/g, ' ').trim() : 
                        'No preview available'
                    });
                  } catch (parseError) {
                    console.error('Parse error:', parseError);
                  }
                });
              });
            });
            
            fetch.once('end', () => {
              imap.end();
            });
          });
        });
      });
      
      imap.connect();
    });
  }

  async markEmailsAsRead(credentials, searchCriteria) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: credentials.email,
        password: credentials.password,
        host: credentials.imap_host || 'imap.gmail.com',
        port: credentials.imap_port || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });
      
      let count = 0;
      
      imap.once('error', reject);
      imap.once('end', () => resolve(count));
      
      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }
          
          imap.search(searchCriteria, (err, results) => {
            if (err) {
              imap.end();
              return reject(err);
            }
            
            if (!results || results.length === 0) {
              imap.end();
              return;
            }
            
            count = results.length;
            
            imap.addFlags(results, '\\Seen', (err) => {
              if (err) reject(err);
              imap.end();
            });
          });
        });
      });
      
      imap.connect();
    });
  }

  extractSearchTerm(command) {
    // Extract search term from commands like "search for emails from john"
    const patterns = [
      /search(?:\s+for)?\s+emails?\s+(?:from|about|containing|with)\s+(.+)/i,
      /search(?:\s+for)?\s+(.+)/i,
      /find\s+emails?\s+(?:from|about|containing|with)\s+(.+)/i
    ];
    
    for (const pattern of patterns) {
      const match = command.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Default: use everything after "search"
    const searchIndex = command.toLowerCase().indexOf('search');
    if (searchIndex !== -1) {
      return command.substring(searchIndex + 6).trim();
    }
    
    return command;
  }

  extractEmailDetails(command) {
    const details = {
      to: null,
      subject: null,
      body: null
    };
    
    // Extract TO email
    const toMatch = command.match(/to\s+([^\s]+@[^\s]+)/i);
    if (toMatch) {
      details.to = toMatch[1];
    }
    
    // Extract subject
    const subjectMatch = command.match(/subject\s+["']([^"']+)["']/i) ||
                         command.match(/with\s+subject\s+(.+?)(?:\s+and\s+|$)/i);
    if (subjectMatch) {
      details.subject = subjectMatch[1];
    }
    
    // Extract body
    const bodyMatch = command.match(/saying\s+["']([^"']+)["']/i) ||
                     command.match(/body\s+["']([^"']+)["']/i) ||
                     command.match(/tell\s+(?:them|him|her)\s+(.+)$/i);
    if (bodyMatch) {
      details.body = bodyMatch[1];
    }
    
    return details;
  }

  buildSearchCriteria(searchTerm) {
    const term = searchTerm.toLowerCase();
    
    // Date-based searches
    if (term.includes('today')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return [['SINCE', today]];
    }
    
    if (term.includes('yesterday')) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return [['SINCE', yesterday], ['BEFORE', new Date()]];
    }
    
    if (term.includes('last week')) {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      return [['SINCE', lastWeek]];
    }
    
    // Email address search
    if (term.includes('@')) {
      return [['FROM', term]];
    }
    
    // Default text search
    return [['TEXT', searchTerm]];
  }
}

module.exports = new EmailService();