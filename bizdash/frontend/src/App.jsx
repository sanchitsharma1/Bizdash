import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { LayoutDashboard, DollarSign, Menu, X, LogIn, LogOut, PlusCircle, Edit2, Trash2, Settings, TrendingUp, TrendingDown, Archive } from 'lucide-react'; // Added Menu, X icons

// --- Configuration ---
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Mobile Sidebar Context ---
const MobileSidebarContext = createContext();

const MobileSidebarProvider = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);
  return (
    <MobileSidebarContext.Provider value={{ isMobileSidebarOpen, toggleMobileSidebar, setIsMobileSidebarOpen }}>
      {children}
    </MobileSidebarContext.Provider>
  );
};

// --- Authentication Context ---
export const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('dashboardUser')));

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
      if (response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('dashboardUser', JSON.stringify(response.data.user));
        toast.success('Login successful!');
        return true;
      }
    } catch (error) {
      console.error("Login error:", error.response ? error.response.data : error.message);
      toast.error(error.response?.data?.message || 'Login failed. Please check credentials.');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dashboardUser');
    toast.success('Logged out successfully!');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Protected Route Component ---
const ProtectedRoute = () => {
  const { user } = React.useContext(AuthContext);
  const location = useLocation();

  if (process.env.NODE_ENV === 'production' && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
};

// --- API Service ---
const api = axios.create({
  baseURL: API_BASE_URL,
});

// --- Reusable Components ---
const Card = ({ title, value, icon, color = 'blue' }) => (
  <div className={`bg-white p-4 sm:p-6 rounded-xl shadow-lg border-l-4 border-${color}-500`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase">{title}</p>
        <p className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900">{typeof value === 'number' ? `₹${value.toFixed(2)}` : value}</p>
      </div>
      <div className={`p-2 sm:p-3 rounded-full bg-${color}-100 text-${color}-600`}>
        {React.cloneElement(icon, { size: icon.props.size === 24 ? 20 : icon.props.size, className: "sm:w-6 sm:h-6 w-5 h-5"})}
      </div>
    </div>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Button = ({ children, onClick, type = "button", variant = "primary", className = "", icon: Icon, disabled = false, size = "normal" }) => {
  const baseStyle = "rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center transition-colors duration-150";
  const sizeStyles = {
    normal: "px-4 py-2 text-sm sm:text-base",
    small: "px-2 py-1 text-xs sm:text-sm",
  };
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
  };
  const disabledStyle = "disabled:opacity-50 disabled:cursor-not-allowed";
  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${disabledStyle} ${className}`} disabled={disabled}>
      {Icon && <Icon size={size === "small" ? 16 : 18} className="mr-2" />}
      {children}
    </button>
  );
};

const Input = ({ label, id, type = "text", value, onChange, required = false, placeholder, className = "" }) => (
  <div className="mb-4">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      id={id}
      name={id}
      value={value}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base ${className}`}
    />
  </div>
);

// --- Layout Components ---
const Sidebar = () => {
  const { user, logout } = React.useContext(AuthContext);
  const { isMobileSidebarOpen, toggleMobileSidebar, setIsMobileSidebarOpen } = useContext(MobileSidebarContext);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Expenses', path: '/expenses', icon: TrendingDown },
    { name: 'Earnings', path: '/earnings', icon: TrendingUp },
    { name: 'Inventory', path: '/inventory', icon: Archive },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
  };

  const handleLinkClick = () => {
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleMobileSidebar}
        ></div>
      )}
      <div
        className={`w-64 h-screen bg-gray-800 text-white flex flex-col fixed top-0 left-0 shadow-lg print:hidden
                    transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
                    lg:translate-x-0 transition-transform duration-300 ease-in-out z-40`}
      >
        <div className="p-6 text-2xl font-semibold border-b border-gray-700 flex justify-between items-center">
          TGS Dashboard
          <button onClick={toggleMobileSidebar} className="lg:hidden text-white hover:text-gray-300">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {navItems.map(item => (
            <Link
              key={item.name}
              to={item.path}
              onClick={handleLinkClick}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-150
                          ${location.pathname === item.path ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 hover:text-blue-300'}`}
            >
              <item.icon size={20} className="mr-3" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          {user ? (
            <>
              <p className="text-sm text-gray-400 mb-2">Logged in as: {user.username}</p>
              <Button onClick={handleLogout} variant="danger" className="w-full" icon={LogOut}>
                Logout
              </Button>
            </>
          ) : (
             (process.env.NODE_ENV === 'production' || !user) && (
               <Link to="/login">
                  <Button variant="primary" className="w-full" icon={LogIn}>
                      Login
                  </Button>
               </Link>
            )
          )}
        </div>
      </div>
    </>
  );
};

const TopBar = () => {
  const { toggleMobileSidebar } = useContext(MobileSidebarContext);
  return (
    <div className="lg:hidden sticky top-0 bg-gray-800 text-white p-4 shadow-md z-20 flex items-center print:hidden">
      <button onClick={toggleMobileSidebar} className="mr-4">
        <Menu size={24} />
      </button>
      <span className="text-xl font-semibold">TGS Dashboard</span>
    </div>
  );
};


const MainLayout = ({ children }) => (
  <div className="flex flex-col lg:flex-row">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <TopBar />
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 md:p-8 bg-gray-100 min-h-screen">
        {children}
      </main>
    </div>
  </div>
);

// --- Page Components ---
const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await api.get('/summary');
        setSummary(response.data);
      } catch (error) {
        console.error("Error fetching summary:", error);
        toast.error('Failed to load summary data.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return <div className="text-center py-10 text-gray-600">Loading dashboard data...</div>;
  if (!summary) return <div className="text-center py-10 text-red-500">Could not load summary data. Please try again later.</div>;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Monthly Overview', font: {size: 14} }, // Smaller font for mobile
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                font: {
                    size: 10 // Smaller ticks font for mobile
                }
            }
        },
        x: {
            ticks: {
                font: {
                    size: 10 // Smaller ticks font for mobile
                }
            }
        }
    }
  };

  const allMonths = new Set([
    ...(summary.monthlyExpenses?.map(e => e.month) || []),
    ...(summary.monthlyEarnings?.map(e => e.month) || [])
  ]);
  const sortedMonths = Array.from(allMonths).sort();

  const chartData = {
    labels: sortedMonths,
    datasets: [
      {
        label: 'Expenses',
        data: sortedMonths.map(month => summary.monthlyExpenses?.find(e => e.month === month)?.total || 0),
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
      {
        label: 'Earnings',
        data: sortedMonths.map(month => summary.monthlyEarnings?.find(e => e.month === month)?.total || 0),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <Card title="Total Earnings" value={summary.totalEarnings} icon={<DollarSign size={24} />} color="green" />
        <Card title="Total Expenses" value={summary.totalExpenses} icon={<TrendingDown size={24} />} color="red" />
        <Card title="Net Profit" value={summary.netProfit} icon={<TrendingUp size={24} />} color="blue" />
        <Card title="Inventory Value" value={summary.totalInventoryValue} icon={<Archive size={24} />} color="purple" />
      </div>
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-700 mb-4">Monthly Performance</h2>
        <div className="h-64 sm:h-80 md:h-96"> {/* Adjusted height for responsiveness */}
        { (summary.monthlyExpenses?.length > 0 || summary.monthlyEarnings?.length > 0) ?
            <Bar options={chartOptions} data={chartData} />
            : <p className="text-gray-500 text-center pt-10">No monthly data available to display chart.</p>
        }
        </div>
      </div>
    </div>
  );
};

const CrudPage = ({ title, endpoint, formFields, columns, itemName, icon }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({});
  const PageIcon = icon || Settings;

  useEffect(() => {
    fetchItems();
  }, [endpoint]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/${endpoint}`);
      setItems(response.data);
    } catch (error) {
      console.error(`Error fetching ${itemName}s:`, error);
      toast.error(`Failed to load ${itemName}s.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === 'number' ? (value === '' ? '' : parseFloat(value)) : value;
    setFormData({ ...formData, [name]: val });
  };

  const resetFormData = () => {
    const initialFormState = formFields.reduce((acc, field) => {
      acc[field.name] = field.type === 'date' ? new Date().toISOString().split('T')[0] : '';
      return acc;
    }, {});
    setFormData(initialFormState);
  };

  const openModal = (itemToEdit = null) => {
    if (itemToEdit) {
      const SANE_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z)?$/;
      const formattedItem = { ...itemToEdit };
      formFields.forEach(field => {
        if (field.type === 'date' && formattedItem[field.name] && SANE_DATE_RE.test(formattedItem[field.name])) {
          formattedItem[field.name] = new Date(formattedItem[field.name]).toISOString().split('T')[0];
        }
      });
      setCurrentItem(formattedItem);
      setFormData(formattedItem);
    } else {
      setCurrentItem(null);
      resetFormData();
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentItem(null);
    resetFormData();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSubmit = { ...formData };
    for (const field of formFields) {
      if (field.type === 'number') {
        if (dataToSubmit[field.name] === '' || dataToSubmit[field.name] === undefined) {
          if (field.required) {
            toast.error(`${field.label} is required.`);
            return;
          }
          dataToSubmit[field.name] = null;
        } else {
          dataToSubmit[field.name] = parseFloat(dataToSubmit[field.name]);
          if (isNaN(dataToSubmit[field.name])) {
             toast.error(`${field.label} must be a valid number.`);
             return;
          }
        }
      }
      if (field.required && (dataToSubmit[field.name] === undefined || String(dataToSubmit[field.name]).trim() === '' || dataToSubmit[field.name] === null)) {
        toast.error(`${field.label} is required.`);
        return;
      }
    }
    try {
      if (currentItem) {
        await api.put(`/${endpoint}/${currentItem.id}`, dataToSubmit);
        toast.success(`${itemName} updated successfully!`);
      } else {
        await api.post(`/${endpoint}`, dataToSubmit);
        toast.success(`${itemName} added successfully!`);
      }
      fetchItems();
      closeModal();
    } catch (error) {
      console.error(`Error saving ${itemName}:`, error.response ? error.response.data : error.message);
      toast.error(error.response?.data?.message || `Failed to save ${itemName}. Check console for details.`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete this ${itemName}? This action cannot be undone.`)) {
      try {
        await api.delete(`/${endpoint}/${id}`);
        toast.success(`${itemName} deleted successfully!`);
        setItems(prevItems => prevItems.filter(item => item.id !== id));
      } catch (error) {
        console.error(`Error deleting ${itemName}:`, error);
        toast.error(`Failed to delete ${itemName}.`);
      }
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center self-start sm:self-center">
          <PageIcon size={24} className="mr-2 sm:mr-3 md:size-30 text-blue-600" /> Manage {title}
        </h1>
        <Button onClick={() => openModal()} variant="primary" icon={PlusCircle} className="w-full sm:w-auto">
          Add New {itemName}
        </Button>
      </div>
      {isLoading ? (
        <p className="text-center py-10 text-gray-600">Loading {itemName}s...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-10">
            <Archive size={36} className="mx-auto text-gray-400 mb-3 sm:size-48 sm:mb-4" />
            <p className="text-gray-600 text-sm sm:text-base">No {itemName}s found.</p>
            <p className="text-xs sm:text-sm text-gray-500">Add one to get started!</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map(col => (
                  <th key={col.key} scope="col" className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {col.label}
                  </th>
                ))}
                <th scope="col" className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                      {col.render ? col.render(item[col.key], item) : item[col.key]}
                    </td>
                  ))}
                  <td className="px-3 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium space-x-1 sm:space-x-2 flex items-center">
                    <Button onClick={() => openModal(item)} variant="secondary" size="small" className="p-1 sm:p-2" icon={Edit2}><span className="sr-only">Edit</span></Button>
                    <Button onClick={() => handleDelete(item.id)} variant="danger" size="small" className="p-1 sm:p-2" icon={Trash2}><span className="sr-only">Delete</span></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={currentItem ? `Edit ${itemName}` : `Add New ${itemName}`}>
        <form onSubmit={handleSubmit}>
          {formFields.map(field => (
            <Input
              key={field.name}
              label={field.label}
              id={field.name}
              type={field.type}
              value={formData[field.name] === null || formData[field.name] === undefined ? '' : formData[field.name]}
              onChange={handleInputChange}
              required={field.required}
              placeholder={field.placeholder}
            />
          ))}
          <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
            <Button onClick={closeModal} variant="secondary" className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" variant="primary" className="w-full sm:w-auto">{currentItem ? 'Save Changes' : `Add ${itemName}`}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const ExpensesPage = () => (
  <CrudPage
    title="Expenses"
    itemName="Expense"
    endpoint="expenses"
    icon={TrendingDown}
    formFields={[
      { name: 'description', label: 'Description', type: 'text', required: true, placeholder: "e.g., TGS Supplies" },
      { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: "e.g., 50.00" },
      { name: 'category', label: 'Category', type: 'text', required: true, placeholder: "e.g., Operations" },
      { name: 'date', label: 'Date', type: 'date', required: true },
    ]}
    columns={[
      { key: 'date', label: 'Date', render: (date) => new Date(date).toLocaleDateString() },
      { key: 'description', label: 'Description' },
      { key: 'category', label: 'Category' },
      { key: 'amount', label: 'Amount', render: (amount) => `₹${parseFloat(amount).toFixed(2)}` },
    ]}
  />
);

const EarningsPage = () => (
  <CrudPage
    title="Earnings"
    itemName="Earning"
    endpoint="earnings"
    icon={TrendingUp}
    formFields={[
      { name: 'description', label: 'Description', type: 'text', required: true, placeholder: "e.g., Client / Product" },
      { name: 'amount', label: 'Amount', type: 'number', required: true, placeholder: "e.g., 1200" },
      { name: 'source', label: 'Source', type: 'text', required: true, placeholder: "e.g., TGS / ToF / JN" },
      { name: 'date', label: 'Date', type: 'date', required: true },
    ]}
    columns={[
      { key: 'date', label: 'Date', render: (date) => new Date(date).toLocaleDateString() },
      { key: 'description', label: 'Description' },
      { key: 'source', label: 'Source' },
      { key: 'amount', label: 'Amount', render: (amount) => `₹${parseFloat(amount).toFixed(2)}` },
    ]}
  />
);

const InventoryPage = () => (
  <CrudPage
    title="Inventory"
    itemName="Item"
    endpoint="inventory"
    icon={Archive}
    formFields={[
      { name: 'name', label: 'Item Name', type: 'text', required: true, placeholder: "e.g., Product A" },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: "e.g., 100" },
      { name: 'cost_price', label: 'Cost Price', type: 'number', required: true, placeholder: "e.g., 10.50" },
      { name: 'selling_price', label: 'Selling Price', type: 'number', required: true, placeholder: "e.g., 19.99" },
      { name: 'supplier', label: 'Supplier (Optional)', type: 'text', placeholder: "e.g., Supplier Inc." },
    ]}
    columns={[
      { key: 'name', label: 'Name' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'cost_price', label: 'Cost Price', render: (val) => val !== null ? `₹${parseFloat(val).toFixed(2)}` : 'N/A' },
      { key: 'selling_price', label: 'Selling Price', render: (val) => val !== null ? `₹${parseFloat(val).toFixed(2)}` : 'N/A' },
      { key: 'supplier', label: 'Supplier' },
    ]}
  />
);

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  useEffect(() => {
    if (user && process.env.NODE_ENV === 'production') {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
        toast.error("Username and password are required.");
        return;
    }
    setLoading(true);
    const success = await login(username, password);
    setLoading(false);
    if (success) {
      navigate(from, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-10 rounded-xl shadow-xl">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Sign in to TGS Dashboard
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <Input
            label="Username"
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Enter your username"
          />
          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
          />
          <div>
            <Button type="submit" variant="primary" className="w-full" disabled={loading} icon={loading ? undefined : LogIn}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Main App Component ---
function App() {
  return (
    <MobileSidebarProvider> {/* Wrap AuthProvider and Router with MobileSidebarProvider */}
      <AuthProvider>
        <Router>
          <Toaster position="top-right" reverseOrder={false} />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainLayout><DashboardPage /></MainLayout>} />
              <Route path="/expenses" element={<MainLayout><ExpensesPage /></MainLayout>} />
              <Route path="/earnings" element={<MainLayout><EarningsPage /></MainLayout>} />
              <Route path="/inventory" element={<MainLayout><InventoryPage /></MainLayout>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </MobileSidebarProvider>
  );
}

export default App;
