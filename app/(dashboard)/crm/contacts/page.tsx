'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Mail,
  Phone,
  Building,
  Star,
  ChevronDown,
} from 'lucide-react';

// Mock data
const contacts = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@acme.com',
    phone: '+1 (555) 123-4567',
    company: 'Acme Corp',
    role: 'VP of Sales',
    status: 'active',
    health: 'good',
    lastContact: '2 days ago',
    deals: 2,
    value: 57000,
    starred: true,
  },
  {
    id: 2,
    name: 'Mike Chen',
    email: 'mike.chen@techstart.io',
    phone: '+1 (555) 234-5678',
    company: 'TechStart Inc',
    role: 'CTO',
    status: 'active',
    health: 'good',
    lastContact: '1 week ago',
    deals: 1,
    value: 12000,
    starred: false,
  },
  {
    id: 3,
    name: 'Lisa Park',
    email: 'lisa.park@global.com',
    phone: '+1 (555) 345-6789',
    company: 'Global Systems',
    role: 'Director of IT',
    status: 'active',
    health: 'warning',
    lastContact: '3 weeks ago',
    deals: 1,
    value: 28000,
    starred: false,
  },
  {
    id: 4,
    name: 'James Wilson',
    email: 'james.wilson@dataflow.co',
    phone: '+1 (555) 456-7890',
    company: 'DataFlow Ltd',
    role: 'CEO',
    status: 'active',
    health: 'good',
    lastContact: '5 days ago',
    deals: 3,
    value: 125000,
    starred: true,
  },
  {
    id: 5,
    name: 'Emma Davis',
    email: 'emma.davis@cloudbase.io',
    phone: '+1 (555) 567-8901',
    company: 'CloudBase',
    role: 'Product Manager',
    status: 'active',
    health: 'good',
    lastContact: 'Yesterday',
    deals: 1,
    value: 8500,
    starred: false,
  },
  {
    id: 6,
    name: 'Robert Taylor',
    email: 'robert@innovate.com',
    phone: '+1 (555) 678-9012',
    company: 'Innovate Labs',
    role: 'Founder',
    status: 'inactive',
    health: 'at-risk',
    lastContact: '2 months ago',
    deals: 0,
    value: 0,
    starred: false,
  },
];

function getHealthColor(health: string) {
  switch (health) {
    case 'good':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'at-risk':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleContact = (id: number) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(filteredContacts.map((c) => c.id));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-500">{contacts.length} total contacts</p>
        </div>
        <Button className="bg-[#0f2d52] hover:bg-[#1a4a7a]">
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-[#0f2d52] focus:ring-[#0f2d52]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deals
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Contact
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleContact(contact.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#0f2d52] focus:ring-[#0f2d52]"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-[#0f2d52]/10 text-[#0f2d52] text-sm font-medium">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{contact.name}</p>
                            {contact.starred && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{contact.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{contact.company}</p>
                          <p className="text-xs text-gray-500">{contact.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${getHealthColor(contact.health)}`} />
                        <span className="text-sm text-gray-600 capitalize">{contact.health}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-900">{contact.deals}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-900">
                        ${contact.value.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-500">{contact.lastContact}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Mail className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Phone className="h-4 w-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4 text-gray-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
