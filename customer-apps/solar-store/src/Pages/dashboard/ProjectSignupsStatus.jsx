import { useState, useEffect } from "react";
import {
  FaBuilding,
  FaClock,
  FaCheckCircle,
  FaEye,
  FaMapMarkerAlt,
  FaBell,
  FaFileAlt,
  FaCalendarAlt,
  FaFilter,
  FaSearch,
  FaUser,
  FaGlobe,
  FaPlus,
  FaMinus,
  FaStar,
} from 'react-icons/fa';
import { MdPendingActions, MdLocationOn, MdMyLocation } from "react-icons/md";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import DropdownWithSearchInput from "@/Components/DropdownWithSearchInput";
import CustomInput from "@/Components/CustomInput";
import Button from "@/Components/Button";

const ProjectSignupsStatus = () => {
  const [fromDate, setFromDate] = useState('2025-01-01');
  const [toDate, setToDate] = useState('2025-12-31');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [selectedProjectType, setSelectedProjectType] = useState('All');
  const [selectedProjectSubType, setSelectedProjectSubType] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedSubUser, setSelectedSubUser] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('Ahmedabad');
  const [mapZoom, setMapZoom] = useState(1);
  const [mapView, setMapView] = useState('standard');

  // Stats data from image 1
  const statsData = [
    {
      id: 1,
      title: 'Total Leads',
      value: 15,
      subtitle: 'This month',
      percentage: 75,
      icon: <FaBuilding />,
      color: 'blue',
    },
    {
      id: 2,
      title: 'Project Quote',
      value: 8,
      subtitle: 'Generated',
      percentage: 60,
      icon: <FaFileAlt />,
      color: 'purple',
    },
    {
      id: 3,
      title: 'Project Signup',
      value: 4,
      subtitle: 'Completed',
      percentage: 45,
      icon: <FaCheckCircle />,
      color: 'green',
    },
    {
      id: 4,
      title: 'In Progress',
      value: 2,
      subtitle: 'Pending Signup',
      percentage: 25,
      icon: <MdPendingActions />,
      color: 'orange',
    },
    {
      id: 5,
      title: 'Overdue',
      value: 1,
      subtitle: 'Need attention',
      percentage: 25,
      icon: <FaClock />,
      color: 'red',
    },
  ];

  // Project signups data
  const projectSignupsData = [
    { id: 1, customer: 'Ravibhai', type: 'Residential', date: '2025-05-15' },
    { id: 2, customer: 'Prdeepsingh', type: 'Commercial', date: '2025-05-10' },
    { id: 3, customer: 'Chagan', type: 'Industrial', date: '2025-04-28' },
    { id: 4, customer: 'Magan', type: 'Residential', date: '2025-05-18' },
    { id: 5, customer: 'Champak', type: 'Commercial', date: '2025-05-20' },
  ];

  // Monthly data for charts
  const monthlyData = [
    { month: 'Jan', residential: 20, commercial: 15, industrial: 8 },
    { month: 'Feb', residential: 25, commercial: 18, industrial: 10 },
    { month: 'Mar', residential: 30, commercial: 22, industrial: 12 },
    { month: 'Apr', residential: 35, commercial: 25, industrial: 15 },
    { month: 'May', residential: 42, commercial: 30, industrial: 18 },
    { month: 'Jun', residential: 38, commercial: 28, industrial: 16 },
    { month: 'Jul', residential: 32, commercial: 24, industrial: 14 },
    { month: 'Aug', residential: 28, commercial: 20, industrial: 11 },
    { month: 'Sep', residential: 35, commercial: 26, industrial: 15 },
    { month: 'Oct', residential: 40, commercial: 32, industrial: 19 },
    { month: 'Nov', residential: 45, commercial: 35, industrial: 22 },
    { month: 'Dec', residential: 50, commercial: 38, industrial: 25 },
  ];

  // Filter options
  const categories = ['All', 'Solar', 'Electrical', 'Plumbing', 'HVAC'];
  const subCategories = ['All', 'Rooftop', 'Ground Mount', 'Hybrid', 'Off-Grid'];
  const projectTypes = ['All', 'Residential', 'Commercial', 'Industrial', 'Government'];
  const projectSubTypes = ['All', 'New Installation', 'Maintenance', 'Upgrade', 'Consultation'];
  const districts = [
    'All',
    'Ahmedabad',
    'Rajkot',
    'Surat',
    'Vadodara',
    'Jamnagar',
    'Bhuj',
    'Junagadh',
    'Anand',
    'Kutch',
  ];
  const subUsers = ['All', 'Bhavik Davda', 'Rajesh Patel', 'Priya Shah', 'Amit Kumar'];

  // Locations data with coordinates (expanded for better map coverage)
  const locations = [
    { name: 'Ahmedabad', projects: 45, coordinates: { x: 35, y: 45 }, type: 'Metro', status: 'active' },
    { name: 'Rajkot', projects: 38, coordinates: { x: 25, y: 55 }, type: 'City', status: 'active' },
    { name: 'Surat', projects: 42, coordinates: { x: 45, y: 60 }, type: 'Metro', status: 'active' },
    { name: 'Vadodara', projects: 32, coordinates: { x: 40, y: 50 }, type: 'City', status: 'active' },
    { name: 'Jamnagar', projects: 28, coordinates: { x: 20, y: 40 }, type: 'City', status: 'active' },
    { name: 'Bhuj', projects: 25, coordinates: { x: 15, y: 30 }, type: 'Town', status: 'active' },
    { name: 'Gandhidham', projects: 22, coordinates: { x: 18, y: 32 }, type: 'Town', status: 'active' },
    { name: 'Mandvi', projects: 18, coordinates: { x: 12, y: 28 }, type: 'Town', status: 'planning' },
    { name: 'Dwaraka', projects: 20, coordinates: { x: 10, y: 35 }, type: 'Town', status: 'active' },
    { name: 'Junagadh', projects: 24, coordinates: { x: 22, y: 48 }, type: 'City', status: 'active' },
    { name: 'Anand', projects: 16, coordinates: { x: 38, y: 52 }, type: 'Town', status: 'planning' },
    { name: 'Khambhat', projects: 14, coordinates: { x: 42, y: 58 }, type: 'Town', status: 'planning' },
    { name: 'Patan', projects: 12, coordinates: { x: 32, y: 25 }, type: 'Town', status: 'planning' },
    { name: 'Valsad', projects: 19, coordinates: { x: 48, y: 65 }, type: 'Town', status: 'active' },
    { name: 'Navsari', projects: 17, coordinates: { x: 46, y: 62 }, type: 'Town', status: 'active' },
    { name: 'Bharuch', projects: 21, coordinates: { x: 44, y: 55 }, type: 'City', status: 'active' },
    { name: 'Amreli', projects: 15, coordinates: { x: 28, y: 52 }, type: 'Town', status: 'planning' },
    { name: 'Banaskantha', projects: 13, coordinates: { x: 30, y: 20 }, type: 'Rural', status: 'planning' },
    { name: 'Sabarkantha', projects: 11, coordinates: { x: 34, y: 22 }, type: 'Rural', status: 'planning' },
    { name: 'Surendranagar', projects: 16, coordinates: { x: 24, y: 38 }, type: 'Town', status: 'active' },
    { name: 'Kutch', projects: 30, coordinates: { x: 12, y: 20 }, type: 'District', status: 'active' },
  ];

  // Recent activities
  const recentActivities = [
    'Project Completed: Solar Rooftop - Rajkot Residence',
    'New Installation Started: Solar Pump - Farm in Junagadh',
    'Maintenance Scheduled: Commercial Installation - Ahmedabad',
    'Project Approved: Residential Solar - Gandhinagar',
    'Site Survey Completed: Industrial Project - Surat',
    'Material Delivered: Commercial Installation - Vadodara',
    'Payment Received: Residential Project - Bhuj',
    'Team Assigned: Commercial Installation - Jamnagar',
  ];

  const typeColors = {
    Residential: 'bg-blue-50 text-blue-600',
    Commercial: 'bg-orange-50 text-orange-600',
    Industrial: 'bg-purple-50 text-purple-600',
  };

  // Find selected location coordinates
  const selectedLocationData = locations.find(loc => loc.name === selectedLocation);

  return (
    <div className="min-h-screen">
      {/* Header with Title */}
      <div className="bg-surface p-4 rounded-lg shadow-sm mb-6 border border-border">
        <h1 className="text-2xl font-bold text-text-primary">Project Signups Dashboard</h1>
      </div>

      {/* Filter Section - All filters from image 1 */}
      <div className="bg-surface p-4 rounded-lg shadow-sm mb-6 border border-border">
        <div className="flex items-center gap-2 mb-3">
          <FaFilter className="text-text-secondary" />
          <h3 className="font-semibold text-text-primary">Filter Options</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <DropdownWithSearchInput
            label="Category"
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categories.map((c) => ({ value: c, text: c }))}
            placeholder="Select category"
            className="w-full"
          />
          <DropdownWithSearchInput
            label="Sub-Category"
            value={selectedSubCategory}
            onChange={setSelectedSubCategory}
            options={subCategories.map((c) => ({ value: c, text: c }))}
            placeholder="Select sub-category"
            className="w-full"
          />
          <DropdownWithSearchInput
            label="Project Type"
            value={selectedProjectType}
            onChange={setSelectedProjectType}
            options={projectTypes.map((c) => ({ value: c, text: c }))}
            placeholder="Select project type"
            className="w-full"
          />
          <DropdownWithSearchInput
            label="Project Sub-Type"
            value={selectedProjectSubType}
            onChange={setSelectedProjectSubType}
            options={projectSubTypes.map((c) => ({ value: c, text: c }))}
            placeholder="Select project sub-type"
            className="w-full"
          />
          <DropdownWithSearchInput
            label="District"
            value={selectedDistrict}
            onChange={setSelectedDistrict}
            options={districts.map((c) => ({ value: c, text: c }))}
            placeholder="Select district"
            className="w-full"
          />
          <DropdownWithSearchInput
            label="SubUsers Name"
            value={selectedSubUser}
            onChange={setSelectedSubUser}
            options={subUsers.map((c) => ({ value: c, text: c }))}
            placeholder="Select user"
            className="w-full"
          />
        </div>
      </div>

      {/* Project Performance Row with Animated Circles */}
      <div className="bg-surface p-4 rounded-lg shadow-sm mb-4 border border-border">
        <h3 className="font-semibold text-text-primary">Project Performance</h3>
        {/* Stats Cards */}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        {statsData.map((stat) => {
          const colorClasses = {
            blue: 'bg-blue-50 text-blue-600',
            purple: 'bg-purple-50 text-purple-600',
            green: 'bg-green-50 text-green-600',
            orange: 'bg-orange-50 text-orange-600',
            red: 'bg-red-50 text-red-600',
          };

          const strokeColors = {
            blue: '#3b82f6',
            purple: '#8b5cf6',
            green: '#22c55e',
            orange: '#f97316',
            red: '#ef4444',
          };

          const [anim, setAnim] = useState(0);
          useEffect(() => {
            const t = setTimeout(() => {
              setAnim(stat.percentage);
            }, 200);
            return () => clearTimeout(t);
          }, [stat.percentage]);

          return (
            <div key={stat.id} className="bg-surface p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-border">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-text-secondary uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1 text-text-primary">{stat.value}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-secondary">{stat.subtitle}</span>
                    <span className="text-xs font-medium text-green-600">{stat.percentage}%</span>
                  </div>
                </div>
                {/* circular progress with icon centered */}
                <div className="relative w-12 h-12">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className="stroke-gray-200"
                      strokeWidth="2"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      className="stroke-current transition-all duration-500 ease-out"
                      style={{
                        stroke: strokeColors[stat.color] || '#3b82f6',
                        strokeWidth: '2',
                        strokeDasharray: '100, 100',
                        strokeDashoffset: `${100 - anim}`,
                        strokeLinecap: 'round',
                        transform: 'rotate(-90deg)',
                        transformOrigin: 'center',
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`p-3 rounded-full ${colorClasses[stat.color]}`}>{stat.icon}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Date Filter Bar */}
      <div className="bg-surface p-4 rounded-lg shadow-sm mb-6 border border-border">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Monthly Project Signups</h2>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-text-muted" />
              <CustomInput
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-text-muted" />
              <CustomInput
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-32"
              />
            </div>
            <Button variant="success" size="sm">
              Apply Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Totals Row */}
      <div className="mb-6 bg-surface p-4 rounded-lg shadow-sm border border-border">
        <div className="flex flex-wrap gap-6 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">Total Residential:</span>
            <span className="font-bold text-green-600">248</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">Total Commercial:</span>
            <span className="font-bold text-blue-600">245</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-secondary">Total Industrial:</span>
            <span className="font-bold text-purple-600">120</span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 divide-x-1 divide-border">
          {/* Bar Chart - Monthly Signups */}
          <div className="pr-4">
            <h3 className="text-md font-semibold mb-4 text-text-primary">Monthly Project Signups</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="residential" fill="#22c55e" name="Residential" />
                <Bar dataKey="commercial" fill="#3b82f6" name="Commercial" />
                <Bar dataKey="industrial" fill="#9333ea" name="Industrial" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Project Types Pie */}
          <div className="">
            <h3 className="text-md font-semibold mb-4 text-text-primary">Project Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Residential', value: 248, color: '#22c55e' },
                    { name: 'Commercial', value: 245, color: '#3b82f6' },
                    { name: 'Industrial', value: 120, color: '#9333ea' },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label
                >
                  {[
                    { name: 'Residential', value: 248, color: '#22c55e' },
                    { name: 'Commercial', value: 245, color: '#3b82f6' },
                    { name: 'Industrial', value: 120, color: '#9333ea' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-600" />
                <span className="text-xs text-text-secondary">Residential (248)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                <span className="text-xs text-text-secondary">Commercial (245)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-purple-600" />
                <span className="text-xs text-text-secondary">Industrial (120)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Large Interactive Map Section */}
      <div className="mb-6 bg-surface rounded-lg shadow-sm p-4 border border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <h3 className="text-md font-semibold flex items-center gap-2 text-text-primary">
            <FaMapMarkerAlt className="text-green-600" />
            Project Location Map
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMapView(mapView === 'standard' ? 'satellite' : 'standard')}
              className="flex items-center gap-1"
            >
              <FaGlobe className="text-sm" />
              {mapView === 'standard' ? 'Satellite' : 'Standard'}
            </Button>
            <div className="flex items-center gap-1 bg-surface-hover rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMapZoom(prev => Math.min(prev + 0.2, 2))}
                className="px-2"
              >
                <FaPlus className="text-sm" />
              </Button>
              <span className="text-sm text-text-secondary px-2">{Math.round(mapZoom * 100)}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMapZoom(prev => Math.max(prev - 0.2, 0.6))}
                className="px-2"
              >
                <FaMinus className="text-sm" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedLocationData) {
                  setMapZoom(1.5);
                }
              }}
              className="flex items-center gap-1"
            >
              <MdMyLocation className="text-sm" />
              Center
            </Button>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative bg-gradient-to-br from-blue-50 to-green-50 rounded-lg h-[500px] overflow-hidden border border-border">
          {/* Map Background Pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              opacity: 0.3,
            }}
          />

          {/* Map Terrain Simulation */}
          {mapView === 'satellite' && (
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(145deg, #2d5a27 0%, #4a7c3b 30%, #6b8c5c 60%, #3b6e2b 100%)',
                opacity: 0.2,
              }}
            />
          )}

          {/* Water Bodies */}
          <div className="absolute inset-0">
            <div className="absolute bottom-0 right-0 w-1/3 h-1/4 bg-blue-200/30 rounded-tl-full" />
            <div className="absolute top-10 left-20 w-32 h-32 bg-blue-200/20 rounded-full" />
          </div>

          {/* Map Content with Zoom */}
          <div
            className="absolute inset-0 transition-transform duration-300"
            style={{
              transform: `scale(${mapZoom})`,
              transformOrigin: selectedLocationData
                ? `${selectedLocationData.coordinates.x}% ${selectedLocationData.coordinates.y}%`
                : 'center',
            }}
          >
            {/* Map Markers */}
            {locations.map((location, index) => {
              const isSelected = selectedLocation === location.name;
              const markerSize = isSelected ? 'text-4xl' : 'text-3xl';
              const markerColor = isSelected
                ? 'text-green-600'
                : location.status === 'active'
                  ? 'text-blue-600'
                  : 'text-text-secondary';

              return (
                <button
                  key={index}
                  onClick={() => setSelectedLocation(location.name)}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 group`}
                  style={{
                    left: `${location.coordinates.x}%`,
                    top: `${location.coordinates.y}%`,
                    zIndex: isSelected ? 30 : 10,
                  }}
                >
                  <div className="relative">
                    {/* Marker Pulse Effect for Selected */}
                    {isSelected && (
                      <span className="absolute inset-0 animate-ping bg-green-400 rounded-full opacity-75" />
                    )}

                    {/* Main Marker */}
                    <MdLocationOn
                      className={`${markerSize} ${markerColor} transition-all duration-200 ${isSelected ? 'scale-125 drop-shadow-lg' : 'hover:scale-110'
                        } cursor-pointer drop-shadow-md`}
                    />

                    {/* Project Count Badge */}
                    <span className={`absolute -top-2 -right-2 ${isSelected ? 'bg-green-600' : 'bg-blue-600'
                      } text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-md`}>
                      {location.projects}
                    </span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-50 transition-opacity whitespace-nowrap z-40 pointer-events-none shadow-lg min-w-[150px]">
                      <div className="font-bold">{location.name}</div>
                      <div className="text-gray-300">{location.projects} projects • {location.type}</div>
                      <div className="text-text-secondary text-[10px] mt-1">Status: {location.status}</div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Location Search Overlay */}
          <div className="absolute top-3 left-3 right-3 z-40">
            <div className="bg-surface rounded-lg shadow-lg p-2 flex items-center gap-2 max-w-md mx-auto border border-border">
              <FaSearch className="text-text-secondary" />
              <input
                type="text"
                placeholder="Search location..."
                className="flex-1 outline-none text-sm"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                list="locations"
              />
              <datalist id="locations">
                {locations.map(loc => (
                  <option key={loc.name} value={loc.name} />
                ))}
              </datalist>
              {selectedLocation && (
                <button
                  onClick={() => setSelectedLocation('')}
                  className="text-text-secondary hover:text-text-primary"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 rounded-lg p-2 shadow-md z-40 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <MdLocationOn className="text-blue-600 text-lg" />
                <span className="text-text-primary">Active</span>
              </div>
              <div className="flex items-center gap-1">
                <MdLocationOn className="text-text-secondary text-lg" />
                <span className="text-text-primary">Planning</span>
              </div>
              <div className="flex items-center gap-1">
                <MdLocationOn className="text-green-600 text-lg" />
                <span className="text-text-primary">Selected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Stats */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-hover rounded-lg p-3 border border-border">
            <div className="text-sm text-text-secondary">Total Locations</div>
            <div className="text-xl font-bold text-text-primary">{locations.length}</div>
          </div>
          <div className="bg-surface-hover rounded-lg p-3 border border-border">
            <div className="text-sm text-text-secondary">Active Projects</div>
            <div className="text-xl font-bold text-green-600">
              {locations.reduce((sum, loc) => sum + loc.projects, 0)}
            </div>
          </div>
          <div className="bg-surface-hover rounded-lg p-3 border border-border">
            <div className="text-sm text-text-secondary">Top Location</div>
            <div className="text-xl font-bold text-text-primary">
              {locations.reduce((max, loc) => (loc.projects > max.projects ? loc : max)).name}
            </div>
          </div>
          <div className="bg-surface-hover rounded-lg p-3 border border-border">
            <div className="text-sm text-text-secondary">Selected</div>
            <div className="text-xl font-bold text-green-600">
              {selectedLocation || 'None'}
            </div>
          </div>
        </div>

        {/* Popular Locations List */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-text-primary mb-3">Popular Locations</h4>
          <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-surface-hover rounded-lg">
            {locations.sort((a, b) => b.projects - a.projects).map((location, index) => (
              <button
                key={index}
                onClick={() => setSelectedLocation(location.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedLocation === location.name
                  ? 'bg-green-600 text-white ring-2 ring-green-300'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover border border-border'
                  }`}
              >
                {location.name} ({location.projects})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content with Table and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Project Signups Table */}
        <div className="lg:col-span-2 bg-surface rounded-lg shadow-sm p-4 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-text-primary">Project Signups</h3>
            <Button variant="link" size="sm" className="text-green-600 hover:underline">
              View All
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                    Customer
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                    Type
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">
                    Date
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projectSignupsData.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-hover">
                    <td className="px-3 py-2 text-sm text-text-primary">{item.customer}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[item.type]
                          }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-text-secondary">{item.date}</td>
                    <td className="px-3 py-2 text-center">
                      <Button variant="ghost" size="sm" className="p-1 rounded">
                        <FaEye className="text-text-secondary" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar - Activities and User Info */}
        <div className="space-y-4">
          {/* Recent Activities */}
          <div className="bg-surface rounded-lg shadow-sm p-4 border border-border">
            <h3 className="text-md font-semibold mb-3 flex items-center gap-2 text-text-primary">
              <FaBell className="text-orange-600" />
              Recent Activities
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {recentActivities.slice(0, 6).map((activity, index) => (
                <div key={index} className="text-xs text-text-secondary border-l-2 border-green-600 pl-2 py-1 hover:bg-surface-hover">
                  {activity}
                </div>
              ))}
            </div>
          </div>

          {/* User Points Card */}
          <div className="bg-gradient-to-r from-green-600 to-green-600 rounded-lg shadow-sm p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-3">
                <FaUser className="text-2xl" />
              </div>
              <div className="flex-1">
                <div className="text-sm opacity-90">Bhavik Davda</div>
                <div className="text-2xl font-bold">60,000</div>
                <div className="text-xs opacity-90">Total Points • Epic Level</div>
              </div>
              <div className="text-4xl"><FaStar /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default ProjectSignupsStatus;