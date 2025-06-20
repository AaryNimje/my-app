// src/agents/emailAgent.js - Complete Implementation
const { DynamicTool } = require('@langchain/core/tools');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const { inspect } = require('util');

class EmailAgent {
  constructor(credentials, llmModel) {
    this.credentials = credentials;
    this.llmModel = llmModel;
    this.tools = this.createTools();
  }

  createTools() {
    const readEmailsTool = new DynamicTool({
      name: 'read_emails',
      description: 'Read unread emails from Gmail inbox. Returns list of recent emails with sender, subject, and preview.',
      func: async () => await this.readEmails()
    });

    const sendEmailTool = new DynamicTool({
      name: 'send_email',
      description: 'Send an email. Input format: recipient|subject|body. Example: john@example.com|Meeting Tomorrow|Hi John, lets meet at 3pm.',
      func: async (input) => await this.sendEmail(input)
    });

    const searchEmailsTool = new DynamicTool({
      name: 'search_emails',
      description: 'Search emails by keyword, sender, or date range. Input: search query',
      func: async (query) => await this.searchEmails(query)
    });

    const replyToEmailTool = new DynamicTool({
      name: 'reply_to_email',
      description: 'Reply to a specific email. Input format: email_id|reply_body',
      func: async (input) => await this.replyToEmail(input)
    });

    const deleteEmailTool = new DynamicTool({
      name: 'delete_email',
      description: 'Delete an email by ID. Input: email_id',
      func: async (emailId) => await this.deleteEmail(emailId)
    });

    const markAsReadTool = new DynamicTool({
      name: 'mark_as_read',
      description: 'Mark emails as read. Input: email_id or "all" for all unread',
      func: async (input) => await this.markAsRead(input)
    });

    return [
      readEmailsTool, 
      sendEmailTool, 
      searchEmailsTool, 
      replyToEmailTool,
      deleteEmailTool,
      markAsReadTool
    ];
  }

  async readEmails() {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.credentials.email,
        password: this.credentials.password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          // Search for unread emails
          imap.search(['UNSEEN'], (err, results) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            if (!results || results.length === 0) {
              imap.end();
              return resolve('No unread emails found.');
            }

            const emails = [];
            const fetchCount = Math.min(results.length, 10); // Limit to 10 emails
            const f = imap.fetch(results.slice(-fetchCount), { 
              bodies: '',
              markSeen: false 
            });

            f.on('message', (msg, seqno) => {
              const email = { id: results[results.length - fetchCount + emails.length] };
              
              msg.on('body', (stream, info) => {
                let buffer = '';
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
                
                stream.once('end', () => {
                  simpleParser(buffer, (err, parsed) => {
                    if (!err) {
                      email.from = parsed.from?.text || 'Unknown';
                      email.subject = parsed.subject || 'No Subject';
                      email.date = parsed.date || new Date();
                      email.text = parsed.text?.substring(0, 200) || '';
                      email.html = parsed.html;
                      emails.push(email);
                    }
                  });
                });
              });
            });

            f.once('error', (err) => {
              imap.end();
              reject(err);
            });

            f.once('end', () => {
              imap.end();
              const summary = emails.map((email, index) => 
                `${index + 1}. From: ${email.from}\n   Subject: ${email.subject}\n   Date: ${new Date(email.date).toLocaleString()}\n   Preview: ${email.text}...\n   ID: ${email.id}`
              ).join('\n\n');
              
              resolve(`Found ${emails.length} unread emails:\n\n${summary}`);
            });
          });
        });
      });

      imap.once('error', (err) => {
        reject(`IMAP Error: ${err.message}`);
      });

      imap.connect();
    });
  }

  async sendEmail(input) {
    try {
      const parts = input.split('|').map(s => s.trim());
      
      if (parts.length < 3) {
        return 'Error: Please provide email in format: recipient|subject|body';
      }

      const [recipient, subject, ...bodyParts] = parts;
      const body = bodyParts.join('|'); // In case body contains |

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipient)) {
        return `Error: Invalid email address format: ${recipient}`;
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.credentials.email,
          pass: this.credentials.password
        }
      });

      const mailOptions = {
        from: `${this.credentials.name || 'AI Assistant'} <${this.credentials.email}>`,
        to: recipient,
        subject: subject,
        text: body,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`
      };

      const info = await transporter.sendMail(mailOptions);
      return `Email sent successfully!\nTo: ${recipient}\nSubject: ${subject}\nMessage ID: ${info.messageId}`;
    } catch (error) {
      return `Error sending email: ${error.message}`;
    }
  }

  async searchEmails(query) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.credentials.email,
        password: this.credentials.password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          // Build search criteria
          const searchCriteria = [];
          
          // Check if query is a date range
          if (query.includes('since:')) {
            const dateMatch = query.match(/since:(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
              searchCriteria.push(['SINCE', new Date(dateMatch[1])]);
            }
          } else if (query.includes('from:')) {
            const fromMatch = query.match(/from:(\S+)/);
            if (fromMatch) {
              searchCriteria.push(['FROM', fromMatch[1]]);
            }
          } else {
            // General text search
            searchCriteria.push(['OR', ['SUBJECT', query], ['TEXT', query]]);
          }

          imap.search(searchCriteria, (err, results) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            if (!results || results.length === 0) {
              imap.end();
              return resolve(`No emails found matching: "${query}"`);
            }

            const emails = [];
            const fetchCount = Math.min(results.length, 20);
            const f = imap.fetch(results.slice(-fetchCount), { bodies: '', markSeen: false });

            f.on('message', (msg, seqno) => {
              const email = { id: results[results.length - fetchCount + emails.length] };
              
              msg.on('body', (stream, info) => {
                let buffer = '';
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
                
                stream.once('end', () => {
                  simpleParser(buffer, (err, parsed) => {
                    if (!err) {
                      email.from = parsed.from?.text || 'Unknown';
                      email.subject = parsed.subject || 'No Subject';
                      email.date = parsed.date || new Date();
                      email.preview = parsed.text?.substring(0, 100) || '';
                      emails.push(email);
                    }
                  });
                });
              });
            });

            f.once('end', () => {
              imap.end();
              const summary = emails.map((email, index) => 
                `${index + 1}. From: ${email.from}\n   Subject: ${email.subject}\n   Date: ${new Date(email.date).toLocaleString()}\n   ID: ${email.id}`
              ).join('\n\n');
              
              resolve(`Found ${emails.length} emails matching "${query}":\n\n${summary}`);
            });
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  async replyToEmail(input) {
    try {
      const [emailId, replyBody] = input.split('|').map(s => s.trim());
      
      if (!emailId || !replyBody) {
        return 'Error: Please provide input in format: email_id|reply_body';
      }

      // First, fetch the original email to get the sender and subject
      const originalEmail = await this.getEmailById(emailId);
      
      if (!originalEmail) {
        return `Error: Could not find email with ID ${emailId}`;
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.credentials.email,
          pass: this.credentials.password
        }
      });

      const mailOptions = {
        from: `${this.credentials.name || 'AI Assistant'} <${this.credentials.email}>`,
        to: originalEmail.from,
        subject: `Re: ${originalEmail.subject}`,
        text: replyBody,
        html: `<p>${replyBody.replace(/\n/g, '<br>')}</p><br><hr><br><p>On ${new Date(originalEmail.date).toLocaleString()}, ${originalEmail.from} wrote:</p><blockquote>${originalEmail.text}</blockquote>`,
        inReplyTo: originalEmail.messageId,
        references: originalEmail.messageId
      };

      const info = await transporter.sendMail(mailOptions);
      return `Reply sent successfully to ${originalEmail.from}!\nSubject: Re: ${originalEmail.subject}`;
    } catch (error) {
      return `Error replying to email: ${error.message}`;
    }
  }

  async deleteEmail(emailId) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.credentials.email,
        password: this.credentials.password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          imap.addFlags(emailId, '\\Deleted', (err) => {
            if (err) {
              imap.end();
              return reject(err);
            }

            imap.expunge((err) => {
              imap.end();
              if (err) {
                return reject(err);
              }
              resolve(`Email ${emailId} deleted successfully.`);
            });
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  async markAsRead(input) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.credentials.email,
        password: this.credentials.password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          if (input.toLowerCase() === 'all') {
            // Mark all unread as read
            imap.search(['UNSEEN'], (err, results) => {
              if (err) {
                imap.end();
                return reject(err);
              }

              if (!results || results.length === 0) {
                imap.end();
                return resolve('No unread emails to mark as read.');
              }

              imap.setFlags(results, '\\Seen', (err) => {
                imap.end();
                if (err) {
                  return reject(err);
                }
                resolve(`Marked ${results.length} emails as read.`);
              });
            });
          } else {
            // Mark specific email as read
            imap.setFlags(input, '\\Seen', (err) => {
              imap.end();
              if (err) {
                return reject(err);
              }
              resolve(`Email ${input} marked as read.`);
            });
          }
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  // Helper method to get email by ID
  async getEmailById(emailId) {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.credentials.email,
        password: this.credentials.password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
      });

      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          const f = imap.fetch(emailId, { bodies: '', struct: true });
          let email = null;

          f.on('message', (msg, seqno) => {
            msg.on('body', (stream, info) => {
              let buffer = '';
              stream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
              });
              
              stream.once('end', () => {
                simpleParser(buffer, (err, parsed) => {
                  if (!err) {
                    email = {
                      from: parsed.from?.text || 'Unknown',
                      subject: parsed.subject || 'No Subject',
                      date: parsed.date || new Date(),
                      text: parsed.text || '',
                      html: parsed.html || '',
                      messageId: parsed.messageId
                    };
                  }
                });
              });
            });
          });

          f.once('end', () => {
            imap.end();
            resolve(email);
          });

          f.once('error', (err) => {
            imap.end();
            reject(err);
          });
        });
      });

      imap.once('error', reject);
      imap.connect();
    });
  }

  async createExecutor() {
    return await initializeAgentExecutorWithOptions(
      this.tools,
      this.llmModel,
      {
        agentType: 'zero-shot-react-description',
        verbose: true,
        maxIterations: 5,
        handleParsingErrors: true
      }
    );
  }
}

module.exports = EmailAgent;