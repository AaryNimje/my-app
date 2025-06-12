import os
import imaplib
import smtplib
import email
from email.mime.text import MIMEText
from langchain.agents import initialize_agent, AgentType
from langchain_groq import ChatGroq
from langchain.tools import Tool
from dotenv import load_dotenv

load_dotenv()


# Function to read unread emails using IMAP
def read_emails(dummy_input: str = "") -> str:
    """Read unread emails. The input parameter is ignored."""
    try:
        # Get credentials from environment variables
        email_address = os.getenv("EMAIL_ADDRESS")
        email_password = os.getenv("EMAIL_PASSWORD")
        if not email_address or not email_password:
            return "Error: Email credentials not set in environment variables."

        # Connect to Gmail IMAP server
        mail = imaplib.IMAP4_SSL('imap.gmail.com')
        mail.login(email_address, email_password)
        mail.select('inbox')
        status, messages = mail.search(None, 'UNSEEN')
        messages = messages[0].split()
        unread_emails = []
        for num in messages[:5]:  # Limit to 5 emails for brevity
            status, msg_data = mail.fetch(num, '(RFC822)')
            raw_email = msg_data[0][1]
            msg = email.message_from_bytes(raw_email)
            subject = msg['Subject'] or "No Subject"
            sender = msg['From'] or "Unknown Sender"
            unread_emails.append(f"From: {sender}, Subject: {subject}")
        mail.close()
        mail.logout()
        return "Unread emails:\n" + "\n".join(unread_emails) if unread_emails else "No unread emails found."
    except Exception as e:
        return f"Error reading emails: {str(e)}"


# Function to send emails using SMTP - modified to accept single string input
def send_email(email_data: str) -> str:
    """
    Send an email. Input format: 'recipient_email|subject|body'
    Example: 'test@example.com|Meeting Tomorrow|Hi, let's meet at 3pm.'
    """
    try:
        # Parse the input string
        parts = email_data.split('|', 2)  # Split into max 3 parts
        if len(parts) != 3:
            return "Error: Please provide email data in format 'recipient|subject|body'"

        recipient, subject, body = parts
        recipient = recipient.strip()
        subject = subject.strip()
        body = body.strip()

        # Get credentials from environment variables
        email_address = os.getenv("EMAIL_ADDRESS")
        email_password = os.getenv("EMAIL_PASSWORD")
        if not email_address or not email_password:
            return "Error: Email credentials not set in environment variables."

        # Create email message
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = email_address
        msg['To'] = recipient

        # Connect to Gmail SMTP server
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(email_address, email_password)
            server.sendmail(email_address, recipient, msg.as_string())
        return f"Email sent to {recipient} with subject '{subject}'"
    except Exception as e:
        return f"Error sending email: {str(e)}"


# Create tools
read_emails_tool = Tool(
    name="read_emails",
    func=read_emails,
    description="Use this tool to read your latest unread emails. It returns a list of unread email subjects and senders. No input required."
)

send_email_tool = Tool(
    name="send_email",
    func=send_email,
    description="Use this tool to send an email. Input format: 'recipient_email|subject|body'. Example: 'test@example.com|Meeting|Hi there, let's meet at 3pm.'"
)

# Initialize LLM
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0)

# Initialize agent
tools = [read_emails_tool, send_email_tool]
agent = initialize_agent(
    tools,
    llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)

if __name__ == "__main__":
    # Test the agent using invoke instead of run
    print("Testing email reading:")
    try:
        result = agent.invoke({"input": "Check my latest unread emails"})
        print(result["output"])
    except Exception as e:
        print(f"Error reading emails: {e}")

    print("\nTesting email sending:")
    try:
        result = agent.invoke(
            {"input": "Send an email to venushome234gmail.com with subject 'Test' and say 'This is a test email'"})
        print(result["output"])
    except Exception as e:
        print(f"Error sending email: {e}")

# Instructions for Gmail setup:
print("""
=== Gmail Setup Instructions ===
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Create a .env file with:
   EMAIL_ADDRESS=your_email@gmail.com
   EMAIL_PASSWORD=your_16_character_app_password

Note: Use the app password, NOT your regular Gmail password!
""")