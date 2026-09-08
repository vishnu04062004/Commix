import { 
  Zap, 
  Globe, 
  Image as ImageIcon, 
  Code, 
  MessageSquare, 
  LayoutGrid, 
  BookOpen, 
  Settings,
  Clock,
  Star,
  Activity,
  Calendar,
  Mail,
  FileText,
  Hash
} from 'lucide-react';
import { SidebarSection } from './types.ts';

export const INITIAL_SUGGESTIONS = [
  "✉️ Send an email",
  "📄 Generate a PDF",
  "📅 Schedule a meeting",
  "💬 Send a Slack message",
  "🧠 Summarize this"
];

export const SIDEBAR_NAVIGATION = [
  { id: 'home', label: 'Home', icon: LayoutGrid },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'library', label: 'Prompt Library', icon: BookOpen },
  { id: 'integrations', label: 'Integrations', icon: Zap },
];

export const HISTORY_SECTIONS: SidebarSection[] = [
  {
    title: 'Today',
    items: [
      { id: 'h1', label: 'Drafting Internship Email' },
      { id: 'h2', label: 'Meeting Schedule Query' },
    ]
  },
  {
    title: 'Yesterday',
    items: [
      { id: 'h3', label: 'Project Deadlines PDF' },
      { id: 'h4', label: 'Slack Announcements' },
    ]
  },
  {
    title: 'Previous 7 days',
    items: [
      { id: 'h5', label: 'Weekly Team Update' },
      { id: 'h6', label: 'React Component Help' },
    ]
  }
];