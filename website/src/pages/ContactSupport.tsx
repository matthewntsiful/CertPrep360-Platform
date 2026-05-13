import { useState } from 'react';
import { motion } from 'framer-motion';
import { HeadphonesIcon, Mail, MessageCircle, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  {
    q: 'How do I reset my exam progress?',
    a: 'Navigate to your Dashboard, select the exam you want to reset, and click "Clear Attempt History". This removes all stored answers and scores for that exam from your account.',
  },
  {
    q: 'Can I access the platform offline?',
    a: 'Yes. CertPrep360 is a Progressive Web App (PWA). After your first visit, the app caches core assets via the service worker, allowing you to continue studying without an internet connection.',
  },
  {
    q: 'Why does my timer keep resetting?',
    a: 'The exam timer auto-saves every 30 seconds to your account. If you experience resets, ensure you are logged in and that your browser is not blocking localStorage. Try clearing site data and logging in again.',
  },
  {
    q: 'How accurate are the practice questions compared to the real SAA-C03 exam?',
    a: 'Our question bank is continuously updated to reflect the current SAA-C03 exam guide domains. Questions are written by certified AWS professionals and reviewed quarterly against the official exam blueprint.',
  },
  {
    q: 'I found an incorrect answer in a question. How do I report it?',
    a: 'Use the contact form on this page and select "Content Issue" as the category. Include the exam number, question number, and your reasoning. Our content team reviews all submissions within 48 hours.',
  },
  {
    q: 'Is there a mobile app available?',
    a: 'CertPrep360 is a fully responsive PWA. On mobile, tap "Add to Home Screen" in your browser to install it as a native-like app with offline support and push notifications.',
  },
];

const channels = [
  {
    icon: Mail,
    title: 'Email Support',
    description: 'For account issues, billing, and detailed technical problems.',
    detail: 'support@certprep360.com',
    sla: 'Response within 24 hours',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10 border-orange-500/20',
  },
  {
    icon: MessageCircle,
    title: 'Live Chat',
    description: 'Instant help for quick questions during business hours.',
    detail: 'Available Mon–Fri, 9am–6pm UTC',
    sla: 'Avg response: 3 minutes',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    icon: Clock,
    title: 'Async Support',
    description: 'Submit a detailed ticket and track its resolution status.',
    detail: 'Via the form below',
    sla: 'Resolution within 48 hours',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
];

const ContactSupport = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', category: 'General', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="space-y-16 pb-20">
      <section className="text-center space-y-4 pt-12">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
            <HeadphonesIcon className="text-orange-500 w-8 h-8" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Contact <span className="text-orange-500">Support</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Our team is here to ensure your certification journey runs without friction.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {channels.map((channel, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-8 border rounded-3xl space-y-4 ${channel.bg}`}
          >
            <channel.icon className={`w-8 h-8 ${channel.color}`} />
            <h3 className="font-bold text-white text-lg">{channel.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{channel.description}</p>
            <p className={`text-sm font-bold ${channel.color}`}>{channel.detail}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{channel.sla}</p>
          </motion.div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* FAQ */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.06 }}
              className="border border-slate-800 rounded-2xl overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left bg-slate-900/50 hover:bg-slate-900 transition-colors"
              >
                <span className="text-sm font-bold text-white pr-4">{faq.q}</span>
                {openFaq === index
                  ? <ChevronUp className="w-4 h-4 text-orange-500 shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
              </button>
              {openFaq === index && (
                <div className="px-5 pb-5 bg-slate-900/30">
                  <p className="text-slate-400 text-sm leading-relaxed pt-3">{faq.a}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Contact Form */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Send a Message</h2>
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center space-y-4"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-bold text-white">Message Received</h3>
              <p className="text-slate-400 text-sm">We'll get back to you within 24 hours. Check your inbox for a confirmation.</p>
              <button
                onClick={() => { setSubmitted(false); setForm({ name: '', email: '', category: 'General', message: '' }); }}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition-all"
              >
                Send Another
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Your name' },
                { label: 'Email Address', key: 'email', type: 'email', placeholder: 'you@example.com' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key} className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
                  <input
                    type={type}
                    required
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                </div>
              ))}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
                >
                  {['General', 'Account Issue', 'Content Issue', 'Technical Bug', 'Billing', 'Feature Request'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Describe your issue or question in detail..."
                  value={form.message}
                  onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-500/20"
              >
                Submit Ticket
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactSupport;
