import { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import './App.css';

// --- Types & Models ---

/**
 * Contact model representing a vCard v3.0 formatted contact
 */
const CONTACT_SCHEMA = {
  name: 'string',
  phone: 'string',
  email: 'string',
  organization: 'string',
  website: 'string',
};

/**
 * Generates a vCard v3.0 formatted string from contact data
 */
function buildVCardString(contact) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  
  if (contact.name) lines.push(`N:${contact.name.split(' ').reverse().join(';')}`);
  if (contact.name) lines.push(`FN:${contact.name}`);
  
  if (contact.phone) lines.push(`TEL:${contact.phone}`);
  if (contact.email) lines.push(`EMAIL:${contact.email}`);
  if (contact.organization) lines.push(`ORG:${contact.organization}`);
  if (contact.website) lines.push(`URL:${contact.website}`);
  
  lines.push('END:VCARD');
  return lines.join('\n');
}

/**
 * Converts vCard string to JSON for storage
 */
function vCardToJSON(vcard) {
  const contact = {};
  const lines = vcard.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('N:')) {
      const parts = line.substring(2).split(';');
      contact.name = [parts[2], parts[1], parts[0]].filter(Boolean).join(' ');
    } else if (line.startsWith('FN:')) {
      contact.name = line.substring(3);
    } else if (line.startsWith('TEL:')) {
      contact.phone = line.substring(4);
    } else if (line.startsWith('EMAIL:')) {
      contact.email = line.substring(6);
    } else if (line.startsWith('ORG:')) {
      contact.organization = line.substring(4);
    } else if (line.startsWith('URL:')) {
      contact.website = line.substring(4);
    }
  }
  
  return contact;
}

// --- Local Storage Service ---

const StorageService = {
  KEY: 'qr_contacts_history',
  
  init() {
    if (!localStorage.getItem(this.KEY)) {
      localStorage.setItem(this.KEY, JSON.stringify([]));
    }
  },
  
  getContacts() {
    const data = localStorage.getItem(this.KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveContact(contact) {
    const contacts = this.getContacts();
    contacts.push(contact);
    localStorage.setItem(this.KEY, JSON.stringify(contacts));
  },
  
  deleteContact(name) {
    const contacts = this.getContacts();
    const filtered = contacts.filter((c) => c.name !== name);
    localStorage.setItem(this.KEY, JSON.stringify(filtered));
  },
  
  clear() {
    localStorage.setItem(this.KEY, JSON.stringify([]));
  },
};

// --- Utility Components ---

function ContactInput({ label, name, value, onChange, placeholder, required = false, error }) {
  return (
    <div className="input-group">
      <label htmlFor={name} className="input-label">
        {label} {required && <span className="required">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={name === 'website' ? 'url' : name === 'phone' ? 'tel' : 'text'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`input-field ${error ? 'input-error' : ''} ${required ? 'required' : ''}`}
        required={required}
      />
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
}

function Button({ children, onClick, variant = 'primary', className = '', type = 'button' }) {
  const variants = {
    primary: 'btn--primary',
    secondary: 'btn--secondary',
    ghost: 'btn--ghost',
  };
  
  return (
    <button
      type={type}
      className={`btn ${variants[variant] || variants.primary} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Screen({ title, children }) {
  return (
    <div className="screen">
      <h1 className="screen-title">{title}</h1>
      {children}
    </div>
  );
}

function QRPreview({ data, size = 256 }) {
  return (
    <div className="qr-preview-container">
      <div className="qr-wrapper">
        {data ? <QRCode value={data} size={size} level="M" /> : <p>No data to preview</p>}
      </div>
    </div>
  );
}

function ContactCard({ contact, onEdit, onDelete }) {
  return (
    <article className="contact-card">
      <div className="contact-card-content">
        <h3 className="contact-name">{contact.name}</h3>
        <div className="contact-details">
          {contact.phone && <span className="contact-phone">{contact.phone}</span>}
          {contact.email && <span className="contact-email">{contact.email}</span>}
          {contact.organization && <span className="contact-org">{contact.organization}</span>}
          {contact.website && <span className="contact-web">{contact.website}</span>}
        </div>
      </div>
      <div className="contact-actions">
        <Button variant="secondary" onClick={() => onEdit(contact)}>Edit</Button>
        <Button variant="ghost" onClick={() => onDelete(contact.name)}>Delete</Button>
      </div>
    </article>
  );
}

function Toast({ message, isVisible, onClose }) {
  return (
    <div 
      className={`toast ${isVisible ? 'toast--visible' : 'toast--hidden'} ${isVisible ? 'toast--in' : 'toast--out'}`}
      onClick={onClose}
    >
      {message}
    </div>
  );
}

// --- Main App Component ---

function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [contactsList, setContactsList] = useState([]);
  
  const [contact, setContact] = useState({
    name: '',
    phone: '',
    email: '',
    organization: '',
    website: '',
  });
  
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ show: false, message: '' });
  const [qrData, setQrData] = useState('');

  useEffect(() => {
    StorageService.init();
    setContactsList(StorageService.getContacts());
  }, []);

  const handleGenerateVCard = () => {
    if (validateForm()) {
      const vcard = buildVCardString(contact);
      setQrData(vcard);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!contact.name.trim()) newErrors.name = 'Full Name is required';
    if (!contact.phone.trim()) newErrors.phone = 'Phone is required';
    if (!contact.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      newErrors.email = 'Valid email required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setContact((prev) => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSave = () => {
    if (validateForm()) {
      const vcard = buildVCardString(contact);
      setQrData(vcard);
      
      const jsonContact = vCardToJSON(vcard);
      StorageService.saveContact(jsonContact);
      setContactsList(StorageService.getContacts());
      
      setToast({ show: true, message: 'Contact saved!' });
      setTimeout(() => {
        setToast({ show: false, message: '' });
      }, 2000);
    }
  };

  const handleEdit = (savedContact) => {
    setContact(savedContact);
    const vcard = buildVCardString(savedContact);
    setQrData(vcard);
    setCurrentScreen('form');
    
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleDelete = (name) => {
    StorageService.deleteContact(name);
    setContactsList(StorageService.getContacts());
    setToast({ show: true, message: 'Contact deleted!' });
    setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2000);
  };

  const handleShare = () => {
    if (navigator.share && qrData) {
      navigator.share({
        title: 'My Contact',
        text: contact.name || 'Check out my contact!',
        url: window.location.href,
      }).catch(() => {});
    }
  };

  return (
    <div className="app-container">
      <nav className="app-nav">
        <Button variant={currentScreen === 'home' ? 'primary' : 'ghost'} onClick={() => setCurrentScreen('home')}>Home</Button>
        <Button variant={currentScreen === 'form' ? 'primary' : 'ghost'} onClick={() => setCurrentScreen('form')}>Create QR</Button>
        <Button variant={currentScreen === 'history' ? 'primary' : 'ghost'} onClick={() => setCurrentScreen('history')}>History</Button>
      </nav>

      {currentScreen === 'home' && (
        <Screen title="Welcome to QR Contact Card">
          <p>Generate, save, and share vCard QR codes instantly.</p>
          <Button onClick={() => setCurrentScreen('form')}>Get Started</Button>
        </Screen>
      )}

      {currentScreen === 'form' && (
        <Screen title="Contact Details">
          <div className="form-container">
            <ContactInput label="Full Name" name="name" value={contact.name} onChange={handleInputChange} required error={errors.name} placeholder="John Doe" />
            <ContactInput label="Phone" name="phone" value={contact.phone} onChange={handleInputChange} required error={errors.phone} placeholder="+1234567890" />
            <ContactInput label="Email" name="email" value={contact.email} onChange={handleInputChange} required error={errors.email} placeholder="john@example.com" />
            <ContactInput label="Organization" name="organization" value={contact.organization} onChange={handleInputChange} placeholder="Company Ltd" />
            <ContactInput label="Website" name="website" value={contact.website} onChange={handleInputChange} placeholder="https://example.com" />
            
            <div className="button-group">
              <Button onClick={handleGenerateVCard} variant="secondary">Preview QR</Button>
              <Button onClick={handleSave} variant="primary">Save & Generate</Button>
            </div>
          </div>
          
          {qrData && (
            <div className="qr-section">
              <QRPreview data={qrData} />
              {navigator.share && <Button onClick={handleShare} variant="ghost">Share Contact</Button>}
            </div>
          )}
        </Screen>
      )}

      {currentScreen === 'history' && (
        <Screen title="Saved Contacts">
          <div className="contacts-list">
            {contactsList.length === 0 ? (
              <p>No saved contacts found.</p>
            ) : (
              contactsList.map((c, idx) => (
                <ContactCard key={idx} contact={c} onEdit={handleEdit} onDelete={handleDelete} />
              ))
            )}
          </div>
        </Screen>
      )}

      <Toast message={toast.message} isVisible={toast.show} onClose={() => setToast({ show: false, message: '' })} />
    </div>
  );
}

export default App;