import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { useDataStore } from "@/src/store/dataStore";
import { useAuthStore } from "@/src/store/authStore";
import { DollarSign, Plus } from "lucide-react";
import { Ticket } from "@/src/types";

export function Tickets() {
  const { tickets, customers, addTicket, updateTicket } = useDataStore();
  const workspace = useAuthStore(state => state.workspace);
  const user = useAuthStore(state => state.user);
  const workspaceRoles = useAuthStore(state => state.workspaceRoles);
  const activeRole = workspace ? workspaceRoles[workspace.id] || user?.role : user?.role;
  const canManageScope = !!activeRole && ["super_admin", "workspace_admin", "operations", "support"].includes(activeRole);
  const workspaceTickets = tickets.filter(t => t.workspaceId === workspace?.id);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTicket, setNewTicket] = useState({
    subject: "",
    customerId: "",
    priority: "normal" as const,
    classification: "content_change" as const
  });

  const handleAdd = () => {
    if (!workspace || !newTicket.subject || !newTicket.customerId) {
      alert("Choose a customer and enter a ticket subject.");
      return;
    }
    addTicket({
      workspaceId: workspace.id,
      subject: newTicket.subject,
      customerId: newTicket.customerId,
      priority: newTicket.priority,
      status: "open",
      classification: newTicket.classification,
      slaDeadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      isBillable: false,
      estimatedHours: 1
    });
    setShowAddModal(false);
    setNewTicket({ subject: "", customerId: "", priority: "normal", classification: "content_change" });
  };

  const handleFlagBillable = async (ticket: Ticket) => {
    await updateTicket(ticket.id, { isBillable: true, estimatedHours: ticket.estimatedHours || 1 });
    alert("Ticket flagged as billable. Sales can now prepare a reviewed proposal from the pipeline.");
  };

  return (
    <div className="space-y-6 flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Support & Ticket Management</h2>
          <p className="text-sm text-slate-500">SLA tracking, change requests & billable scope conversions.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-1.5" /> Log Support Ticket
        </Button>
      </div>

      {/* TICKETS TABLE */}
      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-800">Support Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Subject / Customer</th>
                  <th className="px-6 py-3">Classification</th>
                  <th className="px-6 py-3">Priority</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">SLA Deadline</th>
                  <th className="px-6 py-3 text-right">Scope Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workspaceTickets.map(t => {
                  const cust = customers.find(c => c.id === t.customerId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div>{t.subject}</div>
                        <div className="text-xs text-slate-500">{cust?.name || 'Customer'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize text-xs">
                          {t.classification?.replace(/_/g, ' ') || 'General'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`capitalize text-[10px] ${t.priority === 'critical' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}`}>
                          {t.priority}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="capitalize text-xs">
                          {t.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {t.slaDeadline ? new Date(t.slaDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '24h'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {t.isBillable ? (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">Billable review needed</Badge>
                        ) : canManageScope ? (
                          <Button size="sm" variant="outline" className="text-purple-700 border-purple-200 hover:bg-purple-50 text-xs" onClick={() => handleFlagBillable(t)}>
                            <DollarSign className="w-3.5 h-3.5 mr-1" /> Flag as billable
                          </Button>
                        ) : <span className="text-xs text-slate-400">Support review required</span>}
                      </td>
                    </tr>
                  )
                })}
                {workspaceTickets.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">No support tickets in this workspace.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* LOG TICKET MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-base font-bold">Log Support Ticket</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label htmlFor="ticket-customer" className="text-xs font-semibold">Customer</label>
                <select
                  id="ticket-customer"
                  className="w-full mt-1 p-2 border rounded-md text-xs bg-white"
                  value={newTicket.customerId}
                  onChange={e => setNewTicket({...newTicket, customerId: e.target.value})}
                >
                  <option value="">Choose a customer</option>
                  {customers.filter(customer => customer.workspaceId === workspace?.id).map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="ticket-subject" className="text-xs font-semibold">Subject / Ticket Title</label>
                <input 
                  id="ticket-subject"
                  className="w-full mt-1 p-2 border rounded-md text-xs"
                  value={newTicket.subject}
                  onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                  placeholder="e.g. Update team page bio & photos"
                />
              </div>

              <div>
                <label htmlFor="ticket-classification" className="text-xs font-semibold">Classification</label>
                <select 
                  id="ticket-classification"
                  className="w-full mt-1 p-2 border rounded-md text-xs bg-white"
                  value={newTicket.classification}
                  onChange={e => setNewTicket({...newTicket, classification: e.target.value as any})}
                >
                  <option value="content_change">Content Change</option>
                  <option value="bug">Bug Fix</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="technical_support">Technical Support</option>
                  <option value="domain_dns">Domain / DNS</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAdd}>Save Ticket</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
