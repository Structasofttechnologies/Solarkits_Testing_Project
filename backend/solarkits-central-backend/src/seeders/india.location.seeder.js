/**
 * ============================================================
 *  INDIA LOCATION SEEDER
 *  Seeds: Country (India) → States/UTs → Clusters → Districts
 * ============================================================
 *  Run:  node src/seeders/india.location.seeder.js
 * ============================================================
 */

require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

// ─── Patch mongoose to avoid OverwriteModelError ─────────────
const originalModel = mongoose.model;
mongoose.model = function (name, schema, collection, skipInit) {
  if (mongoose.models[name]) return mongoose.models[name];
  return originalModel.apply(this, arguments);
};
const originalConnectionModel = mongoose.Connection.prototype.model;
mongoose.Connection.prototype.model = function (name, schema, collection) {
  if (this.models[name]) return this.models[name];
  return originalConnectionModel.apply(this, arguments);
};

// ─── Inline Schemas ───────────────────────────────────────────
const geoLevel0Schema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true, maxlength: 50 },
  iso2:             { type: String, required: true, trim: true, uppercase: true, minlength: 2, maxlength: 2 },
  phone_code:       { type: String, required: true, trim: true, maxlength: 10 },
  min_phone_length: { type: Number, default: 0 },
  max_phone_length: { type: Number, default: 0 },
  currency_name:    { type: String, default: '', maxlength: 100 },
  currency_code:    { type: String, default: '', uppercase: true, maxlength: 3 },
  is_active:        { type: Boolean, default: true },
  deleted_at:       { type: Date, default: null },
}, { collection: 'geolocation_level_0', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const geoLevel1Schema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true, maxlength: 100 },
  level_0:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_0', required: true },
  is_active:  { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'geolocation_level_1', timestamps: false });

const clusterSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true, maxlength: 100 },
  level_1:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  is_active:  { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'clusters', timestamps: false });

const geoLevel2Schema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true, maxlength: 100 },
  level_1:    { type: mongoose.Schema.Types.ObjectId, ref: 'geolocation_level_1', required: true },
  cluster:    { type: mongoose.Schema.Types.ObjectId, ref: 'clusters', default: null },
  is_active:  { type: Boolean, default: true },
  deleted_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
}, { collection: 'geolocation_level_2', timestamps: false });

const GeoLevel0 = mongoose.model('geolocation_level_0', geoLevel0Schema);
const GeoLevel1 = mongoose.model('geolocation_level_1', geoLevel1Schema);
const Cluster   = mongoose.model('clusters', clusterSchema);
const GeoLevel2 = mongoose.model('geolocation_level_2', geoLevel2Schema);

// ─── DATA ─────────────────────────────────────────────────────

const INDIA = {
  name: 'India',
  iso2: 'IN',
  phone_code: '+91',
  min_phone_length: 10,
  max_phone_length: 10,
  currency_name: 'Indian Rupee',
  currency_code: 'INR',
  is_active: true,
  deleted_at: null,
};

const INDIA_STATES = [
  {
    name: 'Andhra Pradesh',
    clusters: ['Coastal Andhra', 'Rayalaseema', 'North Andhra'],
    districts: ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Prakasam', 'Srikakulam', 'Sri Potti Sriramulu Nellore', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
    districtClusterMap: {
      'Anantapur': 'Rayalaseema', 'Chittoor': 'Rayalaseema', 'YSR Kadapa': 'Rayalaseema', 'Kurnool': 'Rayalaseema',
      'East Godavari': 'Coastal Andhra', 'Guntur': 'Coastal Andhra', 'Krishna': 'Coastal Andhra', 'Prakasam': 'Coastal Andhra', 'Sri Potti Sriramulu Nellore': 'Coastal Andhra', 'West Godavari': 'Coastal Andhra',
      'Srikakulam': 'North Andhra', 'Visakhapatnam': 'North Andhra', 'Vizianagaram': 'North Andhra',
    }
  },
  {
    name: 'Arunachal Pradesh',
    clusters: ['East Arunachal', 'West Arunachal', 'Central Arunachal'],
    districts: ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai', 'Pakke Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang', 'Tirap', 'Upper Dibang Valley', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
    districtClusterMap: {
      'Anjaw': 'East Arunachal', 'Changlang': 'East Arunachal', 'Dibang Valley': 'East Arunachal', 'Lohit': 'East Arunachal', 'Longding': 'East Arunachal', 'Lower Dibang Valley': 'East Arunachal', 'Namsai': 'East Arunachal', 'Tirap': 'East Arunachal', 'Upper Dibang Valley': 'East Arunachal',
      'Tawang': 'West Arunachal', 'West Kameng': 'West Arunachal', 'East Kameng': 'West Arunachal',
      'East Siang': 'Central Arunachal', 'Kamle': 'Central Arunachal', 'Kra Daadi': 'Central Arunachal', 'Kurung Kumey': 'Central Arunachal', 'Lepa Rada': 'Central Arunachal', 'Lower Siang': 'Central Arunachal', 'Lower Subansiri': 'Central Arunachal', 'Pakke Kessang': 'Central Arunachal', 'Papum Pare': 'Central Arunachal', 'Shi Yomi': 'Central Arunachal', 'Siang': 'Central Arunachal', 'Upper Siang': 'Central Arunachal', 'Upper Subansiri': 'Central Arunachal', 'West Siang': 'Central Arunachal',
    }
  },
  {
    name: 'Assam',
    clusters: ['Upper Assam', 'Lower Assam', 'Central Assam', 'Barak Valley'],
    districts: ['Bajali', 'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tamulpur', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'],
    districtClusterMap: {
      'Dibrugarh': 'Upper Assam', 'Tinsukia': 'Upper Assam', 'Sivasagar': 'Upper Assam', 'Charaideo': 'Upper Assam', 'Jorhat': 'Upper Assam', 'Golaghat': 'Upper Assam', 'Dhemaji': 'Upper Assam', 'Lakhimpur': 'Upper Assam', 'Majuli': 'Upper Assam', 'Biswanath': 'Upper Assam',
      'Kamrup': 'Lower Assam', 'Kamrup Metropolitan': 'Lower Assam', 'Nalbari': 'Lower Assam', 'Barpeta': 'Lower Assam', 'Bajali': 'Lower Assam', 'Bongaigaon': 'Lower Assam', 'Chirang': 'Lower Assam', 'Kokrajhar': 'Lower Assam', 'Dhubri': 'Lower Assam', 'South Salmara-Mankachar': 'Lower Assam', 'Goalpara': 'Lower Assam',
      'Nagaon': 'Central Assam', 'Morigaon': 'Central Assam', 'Hojai': 'Central Assam', 'Darrang': 'Central Assam', 'Sonitpur': 'Central Assam', 'Udalguri': 'Central Assam', 'Baksa': 'Central Assam', 'Tamulpur': 'Central Assam', 'Karbi Anglong': 'Central Assam', 'West Karbi Anglong': 'Central Assam', 'Dima Hasao': 'Central Assam',
      'Cachar': 'Barak Valley', 'Hailakandi': 'Barak Valley', 'Karimganj': 'Barak Valley',
    }
  },
  {
    name: 'Bihar',
    clusters: ['North Bihar', 'South Bihar', 'Central Bihar', 'East Bihar'],
    districts: ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],
    districtClusterMap: {
      'Darbhanga': 'North Bihar', 'East Champaran': 'North Bihar', 'Madhubani': 'North Bihar', 'Muzaffarpur': 'North Bihar', 'Sheohar': 'North Bihar', 'Sitamarhi': 'North Bihar', 'Vaishali': 'North Bihar', 'West Champaran': 'North Bihar', 'Gopalganj': 'North Bihar', 'Siwan': 'North Bihar', 'Saran': 'North Bihar',
      'Arwal': 'South Bihar', 'Aurangabad': 'South Bihar', 'Gaya': 'South Bihar', 'Jehanabad': 'South Bihar', 'Kaimur': 'South Bihar', 'Nalanda': 'South Bihar', 'Nawada': 'South Bihar', 'Rohtas': 'South Bihar', 'Buxar': 'South Bihar', 'Bhojpur': 'South Bihar',
      'Begusarai': 'Central Bihar', 'Khagaria': 'Central Bihar', 'Lakhisarai': 'Central Bihar', 'Munger': 'Central Bihar', 'Patna': 'Central Bihar', 'Samastipur': 'Central Bihar', 'Sheikhpura': 'Central Bihar',
      'Araria': 'East Bihar', 'Banka': 'East Bihar', 'Bhagalpur': 'East Bihar', 'Jamui': 'East Bihar', 'Katihar': 'East Bihar', 'Kishanganj': 'East Bihar', 'Madhepura': 'East Bihar', 'Purnia': 'East Bihar', 'Saharsa': 'East Bihar', 'Supaul': 'East Bihar',
    }
  },
  {
    name: 'Chhattisgarh',
    clusters: ['North Chhattisgarh', 'Central Chhattisgarh', 'South Chhattisgarh'],
    districts: ['Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Khairagarh', 'Kondagaon', 'Korba', 'Korea', 'Mahasamund', 'Manendragarh', 'Mohla-Manpur', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh', 'Sukma', 'Surajpur', 'Surguja'],
    districtClusterMap: {
      'Balrampur': 'North Chhattisgarh', 'Jashpur': 'North Chhattisgarh', 'Korea': 'North Chhattisgarh', 'Manendragarh': 'North Chhattisgarh', 'Raigarh': 'North Chhattisgarh', 'Surajpur': 'North Chhattisgarh', 'Surguja': 'North Chhattisgarh', 'Gaurela-Pendra-Marwahi': 'North Chhattisgarh',
      'Balod': 'Central Chhattisgarh', 'Baloda Bazar': 'Central Chhattisgarh', 'Bemetara': 'Central Chhattisgarh', 'Bilaspur': 'Central Chhattisgarh', 'Dhamtari': 'Central Chhattisgarh', 'Durg': 'Central Chhattisgarh', 'Gariaband': 'Central Chhattisgarh', 'Janjgir-Champa': 'Central Chhattisgarh', 'Kabirdham': 'Central Chhattisgarh', 'Khairagarh': 'Central Chhattisgarh', 'Korba': 'Central Chhattisgarh', 'Mahasamund': 'Central Chhattisgarh', 'Mohla-Manpur': 'Central Chhattisgarh', 'Mungeli': 'Central Chhattisgarh', 'Raipur': 'Central Chhattisgarh', 'Rajnandgaon': 'Central Chhattisgarh', 'Sakti': 'Central Chhattisgarh', 'Sarangarh-Bilaigarh': 'Central Chhattisgarh',
      'Bastar': 'South Chhattisgarh', 'Bijapur': 'South Chhattisgarh', 'Dantewada': 'South Chhattisgarh', 'Kanker': 'South Chhattisgarh', 'Kondagaon': 'South Chhattisgarh', 'Narayanpur': 'South Chhattisgarh', 'Sukma': 'South Chhattisgarh',
    }
  },
  {
    name: 'Goa',
    clusters: ['North Goa', 'South Goa'],
    districts: ['North Goa', 'South Goa'],
    districtClusterMap: { 'North Goa': 'North Goa', 'South Goa': 'South Goa' }
  },
  {
    name: 'Gujarat',
    clusters: ['Saurashtra', 'North Gujarat', 'Central Gujarat', 'South Gujarat', 'Kutch'],
    districts: ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
    districtClusterMap: {
      'Amreli': 'Saurashtra', 'Bhavnagar': 'Saurashtra', 'Botad': 'Saurashtra', 'Devbhoomi Dwarka': 'Saurashtra', 'Gir Somnath': 'Saurashtra', 'Jamnagar': 'Saurashtra', 'Junagadh': 'Saurashtra', 'Morbi': 'Saurashtra', 'Porbandar': 'Saurashtra', 'Rajkot': 'Saurashtra', 'Surendranagar': 'Saurashtra',
      'Banaskantha': 'North Gujarat', 'Gandhinagar': 'North Gujarat', 'Mehsana': 'North Gujarat', 'Patan': 'North Gujarat', 'Sabarkantha': 'North Gujarat', 'Aravalli': 'North Gujarat',
      'Ahmedabad': 'Central Gujarat', 'Anand': 'Central Gujarat', 'Kheda': 'Central Gujarat', 'Mahisagar': 'Central Gujarat',
      'Bharuch': 'South Gujarat', 'Chhota Udaipur': 'South Gujarat', 'Dahod': 'South Gujarat', 'Dang': 'South Gujarat', 'Narmada': 'South Gujarat', 'Navsari': 'South Gujarat', 'Panchmahal': 'South Gujarat', 'Surat': 'South Gujarat', 'Tapi': 'South Gujarat', 'Vadodara': 'South Gujarat', 'Valsad': 'South Gujarat',
      'Kutch': 'Kutch',
    }
  },
  {
    name: 'Haryana',
    clusters: ['North Haryana', 'South Haryana', 'Central Haryana'],
    districts: ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
    districtClusterMap: {
      'Ambala': 'North Haryana', 'Kurukshetra': 'North Haryana', 'Panchkula': 'North Haryana', 'Yamunanagar': 'North Haryana', 'Karnal': 'North Haryana', 'Kaithal': 'North Haryana', 'Panipat': 'North Haryana',
      'Bhiwani': 'South Haryana', 'Charkhi Dadri': 'South Haryana', 'Faridabad': 'South Haryana', 'Gurugram': 'South Haryana', 'Mahendragarh': 'South Haryana', 'Nuh': 'South Haryana', 'Palwal': 'South Haryana', 'Rewari': 'South Haryana',
      'Fatehabad': 'Central Haryana', 'Hisar': 'Central Haryana', 'Jhajjar': 'Central Haryana', 'Jind': 'Central Haryana', 'Rohtak': 'Central Haryana', 'Sirsa': 'Central Haryana', 'Sonipat': 'Central Haryana',
    }
  },
  {
    name: 'Himachal Pradesh',
    clusters: ['Upper Himachal', 'Lower Himachal'],
    districts: ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
    districtClusterMap: {
      'Chamba': 'Upper Himachal', 'Kinnaur': 'Upper Himachal', 'Kullu': 'Upper Himachal', 'Lahaul and Spiti': 'Upper Himachal', 'Shimla': 'Upper Himachal', 'Sirmaur': 'Upper Himachal',
      'Bilaspur': 'Lower Himachal', 'Hamirpur': 'Lower Himachal', 'Kangra': 'Lower Himachal', 'Mandi': 'Lower Himachal', 'Solan': 'Lower Himachal', 'Una': 'Lower Himachal',
    }
  },
  {
    name: 'Jharkhand',
    clusters: ['North Jharkhand', 'South Jharkhand', 'Central Jharkhand'],
    districts: ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'],
    districtClusterMap: {
      'Bokaro': 'North Jharkhand', 'Giridih': 'North Jharkhand', 'Hazaribagh': 'North Jharkhand', 'Koderma': 'North Jharkhand', 'Ramgarh': 'North Jharkhand', 'Dhanbad': 'North Jharkhand',
      'East Singhbhum': 'South Jharkhand', 'Gumla': 'South Jharkhand', 'Khunti': 'South Jharkhand', 'Ranchi': 'South Jharkhand', 'Seraikela Kharsawan': 'South Jharkhand', 'Simdega': 'South Jharkhand', 'West Singhbhum': 'South Jharkhand', 'Lohardaga': 'South Jharkhand',
      'Chatra': 'Central Jharkhand', 'Deoghar': 'Central Jharkhand', 'Dumka': 'Central Jharkhand', 'Garhwa': 'Central Jharkhand', 'Godda': 'Central Jharkhand', 'Jamtara': 'Central Jharkhand', 'Latehar': 'Central Jharkhand', 'Pakur': 'Central Jharkhand', 'Palamu': 'Central Jharkhand', 'Sahibganj': 'Central Jharkhand',
    }
  },
  {
    name: 'Karnataka',
    clusters: ['North Karnataka', 'South Karnataka', 'Central Karnataka', 'Coastal Karnataka'],
    districts: ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'],
    districtClusterMap: {
      'Bagalkot': 'North Karnataka', 'Belagavi': 'North Karnataka', 'Bidar': 'North Karnataka', 'Dharwad': 'North Karnataka', 'Gadag': 'North Karnataka', 'Haveri': 'North Karnataka', 'Kalaburagi': 'North Karnataka', 'Koppal': 'North Karnataka', 'Raichur': 'North Karnataka', 'Vijayapura': 'North Karnataka', 'Yadgir': 'North Karnataka',
      'Bengaluru Rural': 'South Karnataka', 'Bengaluru Urban': 'South Karnataka', 'Chamarajanagar': 'South Karnataka', 'Chikkaballapur': 'South Karnataka', 'Kolar': 'South Karnataka', 'Mandya': 'South Karnataka', 'Mysuru': 'South Karnataka', 'Ramanagara': 'South Karnataka', 'Tumakuru': 'South Karnataka', 'Kodagu': 'South Karnataka', 'Hassan': 'South Karnataka',
      'Ballari': 'Central Karnataka', 'Chikkamagaluru': 'Central Karnataka', 'Chitradurga': 'Central Karnataka', 'Davanagere': 'Central Karnataka', 'Shivamogga': 'Central Karnataka',
      'Dakshina Kannada': 'Coastal Karnataka', 'Udupi': 'Coastal Karnataka', 'Uttara Kannada': 'Coastal Karnataka',
    }
  },
  {
    name: 'Kerala',
    clusters: ['North Kerala', 'South Kerala', 'Central Kerala'],
    districts: ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
    districtClusterMap: {
      'Kannur': 'North Kerala', 'Kasaragod': 'North Kerala', 'Kozhikode': 'North Kerala', 'Malappuram': 'North Kerala', 'Wayanad': 'North Kerala',
      'Kollam': 'South Kerala', 'Pathanamthitta': 'South Kerala', 'Thiruvananthapuram': 'South Kerala', 'Alappuzha': 'South Kerala',
      'Ernakulam': 'Central Kerala', 'Idukki': 'Central Kerala', 'Kottayam': 'Central Kerala', 'Palakkad': 'Central Kerala', 'Thrissur': 'Central Kerala',
    }
  },
  {
    name: 'Madhya Pradesh',
    clusters: ['Bundelkhand', 'Malwa', 'Vindhya', 'Mahakoshal', 'Gwalior-Chambal'],
    districts: ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
    districtClusterMap: {
      'Chhatarpur': 'Bundelkhand', 'Damoh': 'Bundelkhand', 'Niwari': 'Bundelkhand', 'Panna': 'Bundelkhand', 'Sagar': 'Bundelkhand', 'Tikamgarh': 'Bundelkhand',
      'Agar Malwa': 'Malwa', 'Dewas': 'Malwa', 'Dhar': 'Malwa', 'Indore': 'Malwa', 'Jhabua': 'Malwa', 'Khandwa': 'Malwa', 'Khargone': 'Malwa', 'Mandsaur': 'Malwa', 'Neemuch': 'Malwa', 'Ratlam': 'Malwa', 'Shajapur': 'Malwa', 'Ujjain': 'Malwa', 'Barwani': 'Malwa', 'Alirajpur': 'Malwa', 'Burhanpur': 'Malwa',
      'Rewa': 'Vindhya', 'Satna': 'Vindhya', 'Sidhi': 'Vindhya', 'Singrauli': 'Vindhya',
      'Anuppur': 'Mahakoshal', 'Balaghat': 'Mahakoshal', 'Betul': 'Mahakoshal', 'Bhopal': 'Mahakoshal', 'Chhindwara': 'Mahakoshal', 'Dindori': 'Mahakoshal', 'Harda': 'Mahakoshal', 'Hoshangabad': 'Mahakoshal', 'Jabalpur': 'Mahakoshal', 'Katni': 'Mahakoshal', 'Mandla': 'Mahakoshal', 'Narsinghpur': 'Mahakoshal', 'Raisen': 'Mahakoshal', 'Sehore': 'Mahakoshal', 'Seoni': 'Mahakoshal', 'Shahdol': 'Mahakoshal', 'Umaria': 'Mahakoshal', 'Vidisha': 'Mahakoshal', 'Rajgarh': 'Mahakoshal',
      'Ashoknagar': 'Gwalior-Chambal', 'Bhind': 'Gwalior-Chambal', 'Datia': 'Gwalior-Chambal', 'Guna': 'Gwalior-Chambal', 'Gwalior': 'Gwalior-Chambal', 'Morena': 'Gwalior-Chambal', 'Sheopur': 'Gwalior-Chambal', 'Shivpuri': 'Gwalior-Chambal',
    }
  },
  {
    name: 'Maharashtra',
    clusters: ['Konkan', 'Nashik Division', 'Aurangabad Division', 'Amravati Division', 'Nagpur Division', 'Pune Division'],
    districts: ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
    districtClusterMap: {
      'Mumbai City': 'Konkan', 'Mumbai Suburban': 'Konkan', 'Palghar': 'Konkan', 'Raigad': 'Konkan', 'Ratnagiri': 'Konkan', 'Sindhudurg': 'Konkan', 'Thane': 'Konkan',
      'Dhule': 'Nashik Division', 'Jalgaon': 'Nashik Division', 'Nashik': 'Nashik Division', 'Nandurbar': 'Nashik Division',
      'Aurangabad': 'Aurangabad Division', 'Beed': 'Aurangabad Division', 'Hingoli': 'Aurangabad Division', 'Jalna': 'Aurangabad Division', 'Latur': 'Aurangabad Division', 'Nanded': 'Aurangabad Division', 'Osmanabad': 'Aurangabad Division', 'Parbhani': 'Aurangabad Division',
      'Akola': 'Amravati Division', 'Amravati': 'Amravati Division', 'Buldhana': 'Amravati Division', 'Washim': 'Amravati Division', 'Yavatmal': 'Amravati Division',
      'Bhandara': 'Nagpur Division', 'Chandrapur': 'Nagpur Division', 'Gadchiroli': 'Nagpur Division', 'Gondia': 'Nagpur Division', 'Nagpur': 'Nagpur Division', 'Wardha': 'Nagpur Division',
      'Ahmednagar': 'Pune Division', 'Kolhapur': 'Pune Division', 'Pune': 'Pune Division', 'Sangli': 'Pune Division', 'Satara': 'Pune Division', 'Solapur': 'Pune Division',
    }
  },
  {
    name: 'Manipur',
    clusters: ['Valley Manipur', 'Hill Manipur'],
    districts: ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'],
    districtClusterMap: {
      'Bishnupur': 'Valley Manipur', 'Imphal East': 'Valley Manipur', 'Imphal West': 'Valley Manipur', 'Jiribam': 'Valley Manipur', 'Kakching': 'Valley Manipur', 'Thoubal': 'Valley Manipur',
      'Chandel': 'Hill Manipur', 'Churachandpur': 'Hill Manipur', 'Kamjong': 'Hill Manipur', 'Kangpokpi': 'Hill Manipur', 'Noney': 'Hill Manipur', 'Pherzawl': 'Hill Manipur', 'Senapati': 'Hill Manipur', 'Tamenglong': 'Hill Manipur', 'Tengnoupal': 'Hill Manipur', 'Ukhrul': 'Hill Manipur',
    }
  },
  {
    name: 'Meghalaya',
    clusters: ['East Meghalaya', 'West Meghalaya'],
    districts: ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'Eastern West Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],
    districtClusterMap: {
      'East Jaintia Hills': 'East Meghalaya', 'East Khasi Hills': 'East Meghalaya', 'Ri Bhoi': 'East Meghalaya', 'West Jaintia Hills': 'East Meghalaya', 'Eastern West Khasi Hills': 'East Meghalaya',
      'East Garo Hills': 'West Meghalaya', 'North Garo Hills': 'West Meghalaya', 'South Garo Hills': 'West Meghalaya', 'South West Garo Hills': 'West Meghalaya', 'South West Khasi Hills': 'West Meghalaya', 'West Garo Hills': 'West Meghalaya', 'West Khasi Hills': 'West Meghalaya',
    }
  },
  {
    name: 'Mizoram',
    clusters: ['North Mizoram', 'South Mizoram'],
    districts: ['Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Saitual', 'Serchhip'],
    districtClusterMap: {
      'Aizawl': 'North Mizoram', 'Champhai': 'North Mizoram', 'Kolasib': 'North Mizoram', 'Mamit': 'North Mizoram', 'Saitual': 'North Mizoram', 'Khawzawl': 'North Mizoram',
      'Hnahthial': 'South Mizoram', 'Lawngtlai': 'South Mizoram', 'Lunglei': 'South Mizoram', 'Saiha': 'South Mizoram', 'Serchhip': 'South Mizoram',
    }
  },
  {
    name: 'Nagaland',
    clusters: ['Western Nagaland', 'Eastern Nagaland'],
    districts: ['Chumoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyu', 'Tuensang', 'Wokha', 'Zunheboto'],
    districtClusterMap: {
      'Chumoukedima': 'Western Nagaland', 'Dimapur': 'Western Nagaland', 'Kohima': 'Western Nagaland', 'Mokokchung': 'Western Nagaland', 'Niuland': 'Western Nagaland', 'Peren': 'Western Nagaland', 'Tseminyu': 'Western Nagaland', 'Wokha': 'Western Nagaland', 'Zunheboto': 'Western Nagaland',
      'Kiphire': 'Eastern Nagaland', 'Longleng': 'Eastern Nagaland', 'Mon': 'Eastern Nagaland', 'Noklak': 'Eastern Nagaland', 'Phek': 'Eastern Nagaland', 'Shamator': 'Eastern Nagaland', 'Tuensang': 'Eastern Nagaland',
    }
  },
  {
    name: 'Odisha',
    clusters: ['Coastal Odisha', 'North Odisha', 'South Odisha', 'Western Odisha'],
    districts: ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Sonepur', 'Sundargarh'],
    districtClusterMap: {
      'Balasore': 'Coastal Odisha', 'Bhadrak': 'Coastal Odisha', 'Cuttack': 'Coastal Odisha', 'Jagatsinghpur': 'Coastal Odisha', 'Jajpur': 'Coastal Odisha', 'Kendrapara': 'Coastal Odisha', 'Khordha': 'Coastal Odisha', 'Puri': 'Coastal Odisha',
      'Kendujhar': 'North Odisha', 'Mayurbhanj': 'North Odisha', 'Sundargarh': 'North Odisha', 'Jharsuguda': 'North Odisha',
      'Gajapati': 'South Odisha', 'Ganjam': 'South Odisha', 'Kandhamal': 'South Odisha', 'Koraput': 'South Odisha', 'Malkangiri': 'South Odisha', 'Nabarangpur': 'South Odisha', 'Rayagada': 'South Odisha',
      'Angul': 'Western Odisha', 'Balangir': 'Western Odisha', 'Bargarh': 'Western Odisha', 'Boudh': 'Western Odisha', 'Deogarh': 'Western Odisha', 'Dhenkanal': 'Western Odisha', 'Kalahandi': 'Western Odisha', 'Nuapada': 'Western Odisha', 'Sambalpur': 'Western Odisha', 'Sonepur': 'Western Odisha', 'Nayagarh': 'Western Odisha',
    }
  },
  {
    name: 'Punjab',
    clusters: ['Majha', 'Malwa', 'Doaba'],
    districts: ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga', 'Mohali', 'Muktsar', 'Nawanshahr', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'Tarn Taran'],
    districtClusterMap: {
      'Amritsar': 'Majha', 'Gurdaspur': 'Majha', 'Pathankot': 'Majha', 'Tarn Taran': 'Majha',
      'Barnala': 'Malwa', 'Bathinda': 'Malwa', 'Faridkot': 'Malwa', 'Fatehgarh Sahib': 'Malwa', 'Fazilka': 'Malwa', 'Ferozepur': 'Malwa', 'Ludhiana': 'Malwa', 'Malerkotla': 'Malwa', 'Mansa': 'Malwa', 'Moga': 'Malwa', 'Mohali': 'Malwa', 'Muktsar': 'Malwa', 'Patiala': 'Malwa', 'Sangrur': 'Malwa',
      'Hoshiarpur': 'Doaba', 'Jalandhar': 'Doaba', 'Kapurthala': 'Doaba', 'Nawanshahr': 'Doaba', 'Rupnagar': 'Doaba',
    }
  },
  {
    name: 'Rajasthan',
    clusters: ['East Rajasthan', 'West Rajasthan', 'North Rajasthan', 'South Rajasthan', 'Central Rajasthan'],
    districts: ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],
    districtClusterMap: {
      'Bharatpur': 'East Rajasthan', 'Dausa': 'East Rajasthan', 'Dholpur': 'East Rajasthan', 'Jaipur': 'East Rajasthan', 'Karauli': 'East Rajasthan', 'Sawai Madhopur': 'East Rajasthan', 'Alwar': 'East Rajasthan',
      'Barmer': 'West Rajasthan', 'Bikaner': 'West Rajasthan', 'Jaisalmer': 'West Rajasthan', 'Jalore': 'West Rajasthan', 'Jodhpur': 'West Rajasthan', 'Pali': 'West Rajasthan', 'Sirohi': 'West Rajasthan',
      'Churu': 'North Rajasthan', 'Hanumangarh': 'North Rajasthan', 'Jhunjhunu': 'North Rajasthan', 'Sikar': 'North Rajasthan', 'Sri Ganganagar': 'North Rajasthan', 'Nagaur': 'North Rajasthan',
      'Banswara': 'South Rajasthan', 'Chittorgarh': 'South Rajasthan', 'Dungarpur': 'South Rajasthan', 'Pratapgarh': 'South Rajasthan', 'Rajsamand': 'South Rajasthan', 'Udaipur': 'South Rajasthan',
      'Ajmer': 'Central Rajasthan', 'Baran': 'Central Rajasthan', 'Bhilwara': 'Central Rajasthan', 'Bundi': 'Central Rajasthan', 'Jhalawar': 'Central Rajasthan', 'Kota': 'Central Rajasthan', 'Tonk': 'Central Rajasthan',
    }
  },
  {
    name: 'Sikkim',
    clusters: ['East Sikkim', 'West Sikkim', 'North Sikkim', 'South Sikkim'],
    districts: ['East Sikkim', 'North Sikkim', 'Pakyong', 'Soreng', 'South Sikkim', 'West Sikkim'],
    districtClusterMap: {
      'East Sikkim': 'East Sikkim', 'Pakyong': 'East Sikkim',
      'West Sikkim': 'West Sikkim', 'Soreng': 'West Sikkim',
      'North Sikkim': 'North Sikkim',
      'South Sikkim': 'South Sikkim',
    }
  },
  {
    name: 'Tamil Nadu',
    clusters: ['North Tamil Nadu', 'South Tamil Nadu', 'Central Tamil Nadu', 'Western Tamil Nadu'],
    districts: ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
    districtClusterMap: {
      'Chennai': 'North Tamil Nadu', 'Chengalpattu': 'North Tamil Nadu', 'Kancheepuram': 'North Tamil Nadu', 'Ranipet': 'North Tamil Nadu', 'Tiruvallur': 'North Tamil Nadu', 'Tiruvannamalai': 'North Tamil Nadu', 'Vellore': 'North Tamil Nadu', 'Viluppuram': 'North Tamil Nadu', 'Kallakurichi': 'North Tamil Nadu', 'Tirupathur': 'North Tamil Nadu',
      'Kanyakumari': 'South Tamil Nadu', 'Madurai': 'South Tamil Nadu', 'Nagapattinam': 'South Tamil Nadu', 'Ramanathapuram': 'South Tamil Nadu', 'Sivaganga': 'South Tamil Nadu', 'Tenkasi': 'South Tamil Nadu', 'Thoothukudi': 'South Tamil Nadu', 'Tirunelveli': 'South Tamil Nadu', 'Virudhunagar': 'South Tamil Nadu', 'Mayiladuthurai': 'South Tamil Nadu',
      'Ariyalur': 'Central Tamil Nadu', 'Cuddalore': 'Central Tamil Nadu', 'Karur': 'Central Tamil Nadu', 'Perambalur': 'Central Tamil Nadu', 'Pudukkottai': 'Central Tamil Nadu', 'Thanjavur': 'Central Tamil Nadu', 'Tiruchirappalli': 'Central Tamil Nadu', 'Tiruvarur': 'Central Tamil Nadu',
      'Coimbatore': 'Western Tamil Nadu', 'Dharmapuri': 'Western Tamil Nadu', 'Dindigul': 'Western Tamil Nadu', 'Erode': 'Western Tamil Nadu', 'Krishnagiri': 'Western Tamil Nadu', 'Namakkal': 'Western Tamil Nadu', 'Nilgiris': 'Western Tamil Nadu', 'Salem': 'Western Tamil Nadu', 'Theni': 'Western Tamil Nadu', 'Tiruppur': 'Western Tamil Nadu',
    }
  },
  {
    name: 'Telangana',
    clusters: ['Hyderabad Region', 'North Telangana', 'South Telangana'],
    districts: ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
    districtClusterMap: {
      'Hyderabad': 'Hyderabad Region', 'Medchal-Malkajgiri': 'Hyderabad Region', 'Rangareddy': 'Hyderabad Region', 'Sangareddy': 'Hyderabad Region', 'Vikarabad': 'Hyderabad Region', 'Medak': 'Hyderabad Region', 'Yadadri Bhuvanagiri': 'Hyderabad Region',
      'Adilabad': 'North Telangana', 'Jagtial': 'North Telangana', 'Jangaon': 'North Telangana', 'Jayashankar Bhupalpally': 'North Telangana', 'Kamareddy': 'North Telangana', 'Karimnagar': 'North Telangana', 'Kumuram Bheem': 'North Telangana', 'Mancherial': 'North Telangana', 'Mulugu': 'North Telangana', 'Nirmal': 'North Telangana', 'Nizamabad': 'North Telangana', 'Peddapalli': 'North Telangana', 'Rajanna Sircilla': 'North Telangana', 'Siddipet': 'North Telangana', 'Warangal Rural': 'North Telangana', 'Warangal Urban': 'North Telangana',
      'Bhadradri Kothagudem': 'South Telangana', 'Jogulamba Gadwal': 'South Telangana', 'Khammam': 'South Telangana', 'Mahabubabad': 'South Telangana', 'Mahabubnagar': 'South Telangana', 'Nagarkurnool': 'South Telangana', 'Nalgonda': 'South Telangana', 'Narayanpet': 'South Telangana', 'Suryapet': 'South Telangana', 'Wanaparthy': 'South Telangana',
    }
  },
  {
    name: 'Tripura',
    clusters: ['North Tripura', 'South Tripura'],
    districts: ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sipahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
    districtClusterMap: {
      'North Tripura': 'North Tripura', 'Unakoti': 'North Tripura', 'Dhalai': 'North Tripura', 'Khowai': 'North Tripura',
      'South Tripura': 'South Tripura', 'Gomati': 'South Tripura', 'Sipahijala': 'South Tripura', 'West Tripura': 'South Tripura',
    }
  },
  {
    name: 'Uttar Pradesh',
    clusters: ['Western UP', 'Central UP', 'Eastern UP', 'Bundelkhand UP', 'Purvanchal'],
    districts: ['Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
    districtClusterMap: {
      'Agra': 'Western UP', 'Aligarh': 'Western UP', 'Amroha': 'Western UP', 'Baghpat': 'Western UP', 'Bijnor': 'Western UP', 'Budaun': 'Western UP', 'Bulandshahr': 'Western UP', 'Etah': 'Western UP', 'Firozabad': 'Western UP', 'Gautam Buddha Nagar': 'Western UP', 'Ghaziabad': 'Western UP', 'Hapur': 'Western UP', 'Hathras': 'Western UP', 'Kasganj': 'Western UP', 'Mainpuri': 'Western UP', 'Mathura': 'Western UP', 'Meerut': 'Western UP', 'Moradabad': 'Western UP', 'Muzaffarnagar': 'Western UP', 'Pilibhit': 'Western UP', 'Rampur': 'Western UP', 'Saharanpur': 'Western UP', 'Sambhal': 'Western UP', 'Shahjahanpur': 'Western UP', 'Shamli': 'Western UP',
      'Auraiya': 'Central UP', 'Bareilly': 'Central UP', 'Etawah': 'Central UP', 'Farrukhabad': 'Central UP', 'Hardoi': 'Central UP', 'Kannauj': 'Central UP', 'Kanpur Dehat': 'Central UP', 'Kanpur Nagar': 'Central UP', 'Kheri': 'Central UP', 'Lucknow': 'Central UP', 'Raebareli': 'Central UP', 'Sitapur': 'Central UP', 'Unnao': 'Central UP',
      'Ambedkar Nagar': 'Eastern UP', 'Amethi': 'Eastern UP', 'Ayodhya': 'Eastern UP', 'Barabanki': 'Eastern UP', 'Bahraich': 'Eastern UP', 'Balrampur': 'Eastern UP', 'Gonda': 'Eastern UP', 'Shravasti': 'Eastern UP', 'Siddharthnagar': 'Eastern UP', 'Sultanpur': 'Eastern UP',
      'Banda': 'Bundelkhand UP', 'Chitrakoot': 'Bundelkhand UP', 'Fatehpur': 'Bundelkhand UP', 'Hamirpur': 'Bundelkhand UP', 'Jalaun': 'Bundelkhand UP', 'Jhansi': 'Bundelkhand UP', 'Kaushambi': 'Bundelkhand UP', 'Lalitpur': 'Bundelkhand UP', 'Mahoba': 'Bundelkhand UP', 'Prayagraj': 'Bundelkhand UP', 'Pratapgarh': 'Bundelkhand UP',
      'Azamgarh': 'Purvanchal', 'Ballia': 'Purvanchal', 'Basti': 'Purvanchal', 'Bhadohi': 'Purvanchal', 'Chandauli': 'Purvanchal', 'Deoria': 'Purvanchal', 'Ghazipur': 'Purvanchal', 'Gorakhpur': 'Purvanchal', 'Jaunpur': 'Purvanchal', 'Kushinagar': 'Purvanchal', 'Maharajganj': 'Purvanchal', 'Mau': 'Purvanchal', 'Mirzapur': 'Purvanchal', 'Sant Kabir Nagar': 'Purvanchal', 'Sonbhadra': 'Purvanchal', 'Varanasi': 'Purvanchal',
    }
  },
  {
    name: 'Uttarakhand',
    clusters: ['Garhwal', 'Kumaon'],
    districts: ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
    districtClusterMap: {
      'Chamoli': 'Garhwal', 'Dehradun': 'Garhwal', 'Haridwar': 'Garhwal', 'Pauri Garhwal': 'Garhwal', 'Rudraprayag': 'Garhwal', 'Tehri Garhwal': 'Garhwal', 'Uttarkashi': 'Garhwal',
      'Almora': 'Kumaon', 'Bageshwar': 'Kumaon', 'Champawat': 'Kumaon', 'Nainital': 'Kumaon', 'Pithoragarh': 'Kumaon', 'Udham Singh Nagar': 'Kumaon',
    }
  },
  {
    name: 'West Bengal',
    clusters: ['North Bengal', 'South Bengal', 'Jungle Mahal', 'Gangetic Delta'],
    districts: ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
    districtClusterMap: {
      'Alipurduar': 'North Bengal', 'Cooch Behar': 'North Bengal', 'Dakshin Dinajpur': 'North Bengal', 'Darjeeling': 'North Bengal', 'Jalpaiguri': 'North Bengal', 'Kalimpong': 'North Bengal', 'Malda': 'North Bengal', 'Uttar Dinajpur': 'North Bengal',
      'Birbhum': 'South Bengal', 'Hooghly': 'South Bengal', 'Howrah': 'South Bengal', 'Kolkata': 'South Bengal', 'Murshidabad': 'South Bengal', 'Nadia': 'South Bengal', 'North 24 Parganas': 'South Bengal', 'Paschim Bardhaman': 'South Bengal', 'Purba Bardhaman': 'South Bengal', 'South 24 Parganas': 'South Bengal',
      'Bankura': 'Jungle Mahal', 'Jhargram': 'Jungle Mahal', 'Paschim Medinipur': 'Jungle Mahal', 'Purulia': 'Jungle Mahal',
      'Purba Medinipur': 'Gangetic Delta',
    }
  },
  // ─── Union Territories ────────────────────────────────────────
  {
    name: 'Andaman and Nicobar Islands',
    clusters: ['North & Middle Andaman', 'South Andaman'],
    districts: ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
    districtClusterMap: {
      'North and Middle Andaman': 'North & Middle Andaman',
      'Nicobar': 'South Andaman', 'South Andaman': 'South Andaman',
    }
  },
  {
    name: 'Chandigarh',
    clusters: ['Chandigarh'],
    districts: ['Chandigarh'],
    districtClusterMap: { 'Chandigarh': 'Chandigarh' }
  },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    clusters: ['Dadra & Nagar Haveli', 'Daman & Diu'],
    districts: ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
    districtClusterMap: {
      'Dadra and Nagar Haveli': 'Dadra & Nagar Haveli',
      'Daman': 'Daman & Diu', 'Diu': 'Daman & Diu',
    }
  },
  {
    name: 'Delhi',
    clusters: ['North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
    districts: ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
    districtClusterMap: {
      'North Delhi': 'North Delhi', 'North West Delhi': 'North Delhi',
      'South Delhi': 'South Delhi', 'South East Delhi': 'South Delhi', 'South West Delhi': 'South Delhi', 'New Delhi': 'South Delhi',
      'East Delhi': 'East Delhi', 'North East Delhi': 'East Delhi', 'Shahdara': 'East Delhi',
      'West Delhi': 'West Delhi', 'Central Delhi': 'West Delhi',
    }
  },
  {
    name: 'Jammu and Kashmir',
    clusters: ['Jammu Division', 'Kashmir Division'],
    districts: ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
    districtClusterMap: {
      'Doda': 'Jammu Division', 'Jammu': 'Jammu Division', 'Kathua': 'Jammu Division', 'Kishtwar': 'Jammu Division', 'Poonch': 'Jammu Division', 'Rajouri': 'Jammu Division', 'Ramban': 'Jammu Division', 'Reasi': 'Jammu Division', 'Samba': 'Jammu Division', 'Udhampur': 'Jammu Division',
      'Anantnag': 'Kashmir Division', 'Bandipora': 'Kashmir Division', 'Baramulla': 'Kashmir Division', 'Budgam': 'Kashmir Division', 'Ganderbal': 'Kashmir Division', 'Kulgam': 'Kashmir Division', 'Kupwara': 'Kashmir Division', 'Pulwama': 'Kashmir Division', 'Shopian': 'Kashmir Division', 'Srinagar': 'Kashmir Division',
    }
  },
  {
    name: 'Ladakh',
    clusters: ['Leh', 'Kargil'],
    districts: ['Kargil', 'Leh'],
    districtClusterMap: { 'Leh': 'Leh', 'Kargil': 'Kargil' }
  },
  {
    name: 'Lakshadweep',
    clusters: ['Lakshadweep'],
    districts: ['Lakshadweep'],
    districtClusterMap: { 'Lakshadweep': 'Lakshadweep' }
  },
  {
    name: 'Puducherry',
    clusters: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
    districts: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
    districtClusterMap: {
      'Puducherry': 'Puducherry', 'Karaikal': 'Karaikal', 'Mahe': 'Mahe', 'Yanam': 'Yanam'
    }
  },
];

// ─── MAIN SEEDER ──────────────────────────────────────────────

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ Connected!\n');

  // ── 1. COUNTRY (India) ─────────────────────────────────────
  let country = await GeoLevel0.findOne({ iso2: 'IN' });
  if (country) {
    console.log(`♻️  India already exists — setting is_active: true`);
    country.is_active = true;
    country.deleted_at = null;
    await country.save();
  } else {
    console.log(`➕ Inserting India...`);
    country = await GeoLevel0.create(INDIA);
  }
  const countryId = country._id;
  console.log(`✅ India (ID: ${countryId})\n`);

  let newStates = 0, newClusters = 0, newDistricts = 0;

  // ── 2. STATES + CLUSTERS + DISTRICTS ───────────────────────
  for (const stateData of INDIA_STATES) {
    // State
    let state = await GeoLevel1.findOne({ name: stateData.name, level_0: countryId });
    if (state) {
      state.is_active = true;
      state.deleted_at = null;
      await state.save();
    } else {
      state = await GeoLevel1.create({
        name: stateData.name,
        level_0: countryId,
        is_active: true,
        deleted_at: null,
      });
      newStates++;
    }
    const stateId = state._id;

    // Clusters
    const clusterMap = {};
    for (const clusterName of stateData.clusters) {
      let cluster = await Cluster.findOne({ name: clusterName, level_1: stateId });
      if (cluster) {
        cluster.is_active = true;
        cluster.deleted_at = null;
        await cluster.save();
      } else {
        cluster = await Cluster.create({
          name: clusterName,
          level_1: stateId,
          is_active: true,
          deleted_at: null,
        });
        newClusters++;
      }
      clusterMap[clusterName] = cluster._id;
    }

    // Districts
    for (const districtName of stateData.districts) {
      const assignedClusterName = stateData.districtClusterMap[districtName] || stateData.clusters[0];
      const clusterId = clusterMap[assignedClusterName] || null;

      let district = await GeoLevel2.findOne({ name: districtName, level_1: stateId });
      if (district) {
        district.is_active = true;
        district.deleted_at = null;
        district.cluster = clusterId;
        await district.save();
      } else {
        await GeoLevel2.create({
          name: districtName,
          level_1: stateId,
          cluster: clusterId,
          is_active: true,
          deleted_at: null,
        });
        newDistricts++;
      }
    }

    console.log(`  ✅ ${stateData.name} → ${stateData.clusters.length} clusters, ${stateData.districts.length} districts`);
  }

  console.log('\n════════════════════════════════════════════════════');
  console.log('🎉  INDIA LOCATION SEEDING COMPLETE!');
  console.log(`    🌍 Country  : India (is_active: true)`);
  console.log(`    🗺️  States   : ${INDIA_STATES.length} total (${newStates} newly inserted)`);
  console.log(`    🏘️  Clusters : ${newClusters} newly inserted`);
  console.log(`    📍 Districts: ${newDistricts} newly inserted`);
  console.log('════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌 Disconnected. Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeder Error:', err);
  process.exit(1);
});
