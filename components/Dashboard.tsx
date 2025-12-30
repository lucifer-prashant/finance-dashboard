'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area 
} from 'recharts';
import { 
  Calendar, TrendingDown, DollarSign, ShoppingCart, 
  Filter, Download, LayoutDashboard, List, 
  PieChart as PieChartIcon, TrendingUp, X, Search, ArrowUpDown 
} from 'lucide-react';

interface Transaction {
  id: string;
  vendor: string;
  amount: string;
  date: string;
  category: string;
  type: string;
}

type TabType = 'overview' | 'transactions' | 'analysis' | 'insights';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Mobile Detection State
  const [isMobile, setIsMobile] = useState(false);

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchVendor, setSearchVendor] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'vendor'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchTransactions();
    
    // Mobile Check Logic
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    // Initial check
    if (typeof window !== 'undefined') {
      checkMobile();
      window.addEventListener('resize', checkMobile);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkMobile);
      }
    };
  }, []);

  const fetchTransactions = async () => {
    try {
      const q = query(collection(db, 'test_transactions'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction));
      setTransactions(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const parseDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('-');
    return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  const filteredTransactions = transactions.filter(t => {
    const tDate = parseDate(t.date);
    const tMonth = tDate.getMonth() + 1;
    const tYear = tDate.getFullYear();
    const tAmount = parseFloat(t.amount.replace('Rs. ', ''));

    if (selectedMonth !== 'all' && tMonth !== parseInt(selectedMonth)) return false;
    if (selectedYear !== 'all' && tYear !== parseInt(selectedYear)) return false;
    if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;
    if (searchVendor && !t.vendor.toLowerCase().includes(searchVendor.toLowerCase())) return false;
    if (minAmount && tAmount < parseFloat(minAmount)) return false;
    if (maxAmount && tAmount > parseFloat(maxAmount)) return false;

    return true;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = parseDate(a.date).getTime() - parseDate(b.date).getTime();
    } else if (sortBy === 'amount') {
      comparison = parseFloat(a.amount.replace('Rs. ', '')) - parseFloat(b.amount.replace('Rs. ', ''));
    } else if (sortBy === 'vendor') {
      comparison = a.vendor.localeCompare(b.vendor);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalSpending = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount.replace('Rs. ', '')), 0);
  const categories = Array.from(new Set(transactions.map(t => t.category)));

  // Data processing for charts
  const monthlyData = (() => {
    const monthly: { [key: string]: number } = {};
    filteredTransactions.forEach(t => {
      const date = parseDate(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = (monthly[key] || 0) + parseFloat(t.amount.replace('Rs. ', ''));
    });
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total: Math.round(total) }));
  })();

  const categoryData = (() => {
    const category: { [key: string]: number } = {};
    filteredTransactions.forEach(t => {
      category[t.category] = (category[t.category] || 0) + parseFloat(t.amount.replace('Rs. ', ''));
    });
    return Object.entries(category)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  })();

  const vendorData = (() => {
    const vendors: { [key: string]: { total: number; count: number } } = {};
    filteredTransactions.forEach(t => {
      const amount = parseFloat(t.amount.replace('Rs. ', ''));
      if (!vendors[t.vendor]) vendors[t.vendor] = { total: 0, count: 0 };
      vendors[t.vendor].total += amount;
      vendors[t.vendor].count += 1;
    });
    return Object.entries(vendors)
      .map(([vendor, data]) => ({ vendor, ...data, total: Math.round(data.total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  })();

  // Mobile specific data slice (Top 5 only)
  const vendorDataMobile = vendorData.slice(0, 5);

  // Vibrant Chart Colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1'];

  const clearFilters = () => {
    setSelectedMonth('all');
    setSelectedCategory('all');
    setSelectedYear('all');
    setSearchVendor('');
    setMinAmount('');
    setMaxAmount('');
  };

  const exportCSV = () => {
    const headers = ['Date', 'Vendor', 'Category', 'Amount'];
    const rows = sortedTransactions.map(t => [t.date, t.vendor, t.category, t.amount.replace('Rs. ', '')]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_tracker_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-sm text-zinc-400 font-mono tracking-wider">LOADING DATA...</div>
        </div>
      </div>
    );
  }

  const activeFiltersCount = [
    selectedMonth !== 'all', selectedCategory !== 'all', selectedYear !== 'all',
    searchVendor, minAmount, maxAmount
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 border-b border-zinc-800 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="flex items-center gap-3 text-lg font-medium text-zinc-100">
                  <span className="w-1.5 h-6 rounded-full bg-white/20 backdrop-blur-md border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.12)]" />
                  Finance Tracker
                </h1>
              </div>
              
              <button onClick={exportCSV} className="md:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-lg border border-zinc-800">
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <div className="text-xs text-zinc-500 font-mono">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div className="h-4 w-px bg-zinc-800"></div>
              <button onClick={exportCSV} className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="pb-4 overflow-x-auto scrollbar-hide">
            <nav className="flex p-1 space-x-1 bg-zinc-900/50 rounded-xl border border-zinc-800/50 min-w-max md:w-fit">
              {[
                { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                { id: 'transactions', label: 'Transactions', icon: List },
                { id: 'analysis', label: 'Analysis', icon: PieChartIcon },
                { id: 'insights', label: 'Insights', icon: TrendingUp }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border
                    ${activeTab === tab.id 
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border-transparent'}
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filters */}
        <div className="mb-8">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${showFilters ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${activeFiltersCount > 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-400'}`}>
                <Filter className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-zinc-200">Filter & Search</div>
                <div className="text-xs text-zinc-500">
                  {activeFiltersCount > 0 ? `${activeFiltersCount} active filters` : 'Refine your view'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeFiltersCount > 0 && (
                <span 
                  onClick={(e) => { e.stopPropagation(); clearFilters(); }}
                  className="text-xs text-red-400 hover:text-red-300 px-3 py-1 rounded-full bg-red-400/10 border border-red-400/20"
                >
                  Clear All
                </span>
              )}
              <span className="text-zinc-500 transform transition-transform duration-200" style={{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </div>
          </button>

          {showFilters && (
            <div className="mt-2 p-4 bg-zinc-900/50 border border-zinc-800 border-t-0 rounded-b-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-2 fade-in duration-200">
               <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input 
                      type="text" 
                      placeholder="Search by vendor name..." 
                      value={searchVendor} 
                      onChange={(e) => setSearchVendor(e.target.value)} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    />
                  </div>
               </div>
               {[
                 { label: 'Year', value: selectedYear, setter: setSelectedYear, options: ['all', '2024', '2025', '2026'], map: (o:string) => o === 'all' ? 'All Years' : o },
                 { label: 'Month', value: selectedMonth, setter: setSelectedMonth, options: ['all', ...Array.from({length:12},(_,i)=>(i+1).toString())], map: (o:string) => o === 'all' ? 'All Months' : new Date(0, parseInt(o)-1).toLocaleString('default', { month: 'long' }) },
                 { label: 'Category', value: selectedCategory, setter: setSelectedCategory, options: ['all', ...categories], map: (o:string) => o === 'all' ? 'All Categories' : o }
               ].map((field, i) => (
                 <div key={i}>
                   <label className="block text-xs font-medium text-zinc-500 mb-1.5 ml-1">{field.label}</label>
                   <select 
                     value={field.value} 
                     onChange={(e) => field.setter(e.target.value)} 
                     className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 appearance-none"
                   >
                     {field.options.map(opt => (
                       <option key={opt} value={opt}>{field.map(opt)}</option>
                     ))}
                   </select>
                 </div>
               ))}
               <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5 ml-1">Min Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">₹</span>
                    <input type="number" placeholder="0" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5 ml-1">Max Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">₹</span>
                    <input type="number" placeholder="Any" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { 
              icon: DollarSign, label: 'Total Spending', 
              value: `₹${totalSpending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 
              color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-l-blue-500' 
            },
            { 
              icon: ShoppingCart, label: 'Transactions', 
              value: filteredTransactions.length, 
              color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-l-emerald-500' 
            },
            { 
              icon: TrendingDown, label: 'Avg / Txn', 
              value: `₹${filteredTransactions.length ? Math.round(totalSpending / filteredTransactions.length) : 0}`, 
              color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-l-orange-500' 
            },
            { 
              icon: Calendar, label: 'Active Months', 
              value: monthlyData.length, 
              color: 'text-violet-500', bg: 'bg-violet-500/10', border: 'border-l-violet-500' 
            }
          ].map((stat, i) => (
            <div key={i} className={`bg-zinc-900 border border-zinc-800 border-l-4 ${stat.border} p-5 rounded-xl hover:bg-zinc-900/80 transition-all shadow-sm`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-zinc-500 text-sm font-medium mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-bold text-zinc-100">{stat.value}</h3>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-zinc-200">Spending Trend</h3>
                  <button className="text-zinc-500 hover:text-white transition-colors"><TrendingUp className="w-4 h-4" /></button>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={monthlyData}
                      onClick={(e) => e?.stopPropagation?.()}
                    >
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                      />
                      <Tooltip
                        cursor={false}
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        itemStyle={{ color: '#e4e4e7' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorTotal)"
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-zinc-200">Category Split</h3>
                  <button className="text-zinc-500 hover:text-white transition-colors"><PieChartIcon className="w-4 h-4" /></button>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={categoryData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={100} 
                        paddingAngle={0} 
                        stroke="none"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#e4e4e7' }}
                        formatter={(value: number) => `₹${value.toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  {categoryData.slice(0, 4).map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-zinc-400">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      {entry.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-zinc-200">Transaction History</h3>
                <div className="flex items-center gap-2">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)} 
                    className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="date">Date</option>
                    <option value="amount">Amount</option>
                    <option value="vendor">Vendor</option>
                  </select>
                  <button 
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} 
                    className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-600"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-400">
                  <thead className="bg-zinc-950/50 uppercase font-medium text-xs text-zinc-500">
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Vendor</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {sortedTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">{t.date}</td>
                        <td className="px-6 py-4 font-medium text-zinc-200">{t.vendor}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {t.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-400">
                          ₹{parseFloat(t.amount.replace('Rs. ', '')).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Vertical Stack */}
              <div className="md:hidden">
                <div className="divide-y divide-zinc-800">
                  {sortedTransactions.map((t) => (
                    <div key={t.id} className="p-4 flex flex-col gap-1 hover:bg-zinc-800/20">
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-zinc-200 text-base">{t.vendor}</span>
                        <span className="font-semibold text-emerald-400">₹{parseFloat(t.amount.replace('Rs. ', '')).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center gap-2">
                           <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{t.category}</span>
                        </div>
                        <span className="text-xs text-zinc-500">{t.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

         {activeTab === 'analysis' && (
            <div className="space-y-6">
               <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-zinc-200 mb-6">Spending by Category</h3>
                <div className="h-[350px] touch-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                      <XAxis type="number" stroke="#71717a" fontSize={12} tickFormatter={(val) => `₹${val/1000}k`} />
                      <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={12} width={100} />
                      <Tooltip 
                         cursor={false}
                         contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                      />
                      <Bar 
                        dataKey="value" 
                        fill="#3b82f6" 
                        radius={[0, 4, 4, 0]} 
                        barSize={20} 
                        activeBar={{ fill: '#60a5fa' }}
                        isAnimationActive={false} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
               </div>

               {/* Top Vendors - Adaptive Chart */}
               <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                 <h3 className="text-lg font-semibold text-zinc-200 mb-6">Top Vendors</h3>
                 <div className={`h-[300px] ${isMobile ? 'overflow-y-auto' : ''}`}>
                   <ResponsiveContainer width="100%" height="100%">
                     {isMobile ? (
                       /* MOBILE: Horizontal Bars (Layout Vertical) */
                       <BarChart
                         data={vendorDataMobile}
                         layout="vertical"
                         margin={{ left: 0, right: 20 }}
                       >
                         <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={true} vertical={false} />
                         <XAxis
                           type="number"
                           stroke="#71717a"
                           fontSize={12}
                           tickFormatter={(val) => `₹${val / 1000}k`}
                         />
                         <YAxis
                           dataKey="vendor"
                           type="category"
                           stroke="#a1a1aa"
                           fontSize={12}
                           width={90}
                           tick={{fill: '#e4e4e7'}}
                         />
                         <Tooltip
                           cursor={false}
                           contentStyle={{
                             backgroundColor: '#18181b',
                             borderColor: '#27272a',
                             color: '#fff',
                             borderRadius: '8px'
                           }}
                         />
                         <Bar
                           dataKey="total"
                           fill="#8b5cf6"
                           radius={[0, 4, 4, 0]}
                           barSize={20}
                           isAnimationActive={false}
                         />
                       </BarChart>
                     ) : (
                       /* DESKTOP: Vertical Bars (Standard) */
                       <BarChart data={vendorData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                         <XAxis
                           dataKey="vendor"
                           stroke="#71717a"
                           fontSize={10}
                           angle={-45}
                           textAnchor="end"
                           height={60}
                         />
                         <YAxis
                           stroke="#71717a"
                           fontSize={12}
                           tickFormatter={(val) => `₹${val / 1000}k`}
                         />
                         <Tooltip
                           cursor={false}
                           contentStyle={{
                             backgroundColor: '#18181b',
                             borderColor: '#27272a',
                             color: '#fff'
                           }}
                         />
                         <Bar
                           dataKey="total"
                           fill="#8b5cf6"
                           radius={[4, 4, 0, 0]}
                           isAnimationActive={false}
                         />
                       </BarChart>
                     )}
                   </ResponsiveContainer>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-red-500/10"></div>
                  <h3 className="text-zinc-500 text-sm font-medium mb-2">Biggest Purchase</h3>
                  <div className="text-3xl font-bold text-zinc-100">
                    ₹{Math.max(...filteredTransactions.map(t => parseFloat(t.amount.replace('Rs. ', '')))).toLocaleString('en-IN')}
                  </div>
                  <p className="text-zinc-500 text-xs mt-2">Single transaction maximum</p>
               </div>

               <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/10"></div>
                  <h3 className="text-zinc-500 text-sm font-medium mb-2">Lowest Purchase</h3>
                  <div className="text-3xl font-bold text-zinc-100">
                    ₹{Math.min(...filteredTransactions.map(t => parseFloat(t.amount.replace('Rs. ', '')))).toLocaleString('en-IN')}
                  </div>
                  <p className="text-zinc-500 text-xs mt-2">Single transaction minimum</p>
               </div>

               <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/10"></div>
                  <h3 className="text-zinc-500 text-sm font-medium mb-2">Top Category</h3>
                  <div className="text-3xl font-bold text-zinc-100">{categoryData[0]?.name || 'N/A'}</div>
                  <p className="text-zinc-500 text-xs mt-2">
                    ₹{categoryData[0]?.value.toLocaleString('en-IN') || 0} spent total
                  </p>
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}