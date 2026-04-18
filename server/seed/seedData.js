require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const NID = require('../models/NID');
const ExamRegister = require('../models/ExamRegister');
const Candidate = require('../models/Candidate');
const Post = require('../models/Post');
const Application = require('../models/Application');
const Result = require('../models/Result');
const AdminUser = require('../models/AdminUser');
const MinistrySection = require('../models/MinistrySection');
const Grievance = require('../models/Grievance');
const Priority = require('../models/Priority');
const PlacementOrder = require('../models/PlacementOrder');
const Officer = require('../models/Officer');
const DistrictTier = require('../models/DistrictTier');
const TransferQueue = require('../models/TransferQueue');
const Appraisal = require('../models/Appraisal');
const Exemption = require('../models/Exemption');
const TransferScore = require('../models/TransferScore');
const TransferWindow = require('../models/TransferWindow');
const TransferOrder = require('../models/TransferOrder');
const Appeal = require('../models/Appeal');
const AuditEntry = require('../models/AuditEntry');
const CiaaAlert = require('../models/CiaaAlert');
const EmergencyTransfer = require('../models/EmergencyTransfer');

// ==================== NID RECORDS ====================
const NID_RECORDS = [
  // 5 candidates
  { nidNumber: '1123456789', nameNepali: 'राम बहादुर श्रेष्ठ', nameEnglish: 'Ram Bahadur Shrestha', dateOfBirth: '1995-04-15', gender: 'Male', mobileNumber: '9841234567', permanentAddress: { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: '10', tole: 'Baneshwor' }, fatherName: 'Hari Bahadur Shrestha', motherName: 'Sita Devi Shrestha', grandparentName: 'Laxman Bahadur Shrestha' },
  { nidNumber: '2234567890', nameNepali: 'सीता कुमारी थापा', nameEnglish: 'Sita Kumari Thapa', dateOfBirth: '1998-07-22', gender: 'Female', mobileNumber: '9851234567', permanentAddress: { province: 'Gandaki', district: 'Kaski', municipality: 'Pokhara Metropolitan City', ward: '5', tole: 'Lakeside' }, fatherName: 'Bir Bahadur Thapa', motherName: 'Maya Devi Thapa', grandparentName: 'Dhan Bahadur Thapa' },
  { nidNumber: '3345678901', nameNepali: 'कृष्ण प्रसाद पौडेल', nameEnglish: 'Krishna Prasad Poudel', dateOfBirth: '1993-01-08', gender: 'Male', mobileNumber: '9861234567', permanentAddress: { province: 'Lumbini', district: 'Rupandehi', municipality: 'Butwal Sub-Metropolitan City', ward: '3', tole: 'Traffic Chowk' }, fatherName: 'Laxmi Prasad Poudel', motherName: 'Durga Devi Poudel', grandparentName: 'Ram Prasad Poudel' },
  { nidNumber: '4456789012', nameNepali: 'अञ्जली राई', nameEnglish: 'Anjali Rai', dateOfBirth: '2000-11-30', gender: 'Female', mobileNumber: '9801234567', permanentAddress: { province: 'Province No. 1', district: 'Dhankuta', municipality: 'Dhankuta Municipality', ward: '2', tole: 'Bazar Tole' }, fatherName: 'Dipak Rai', motherName: 'Sunita Rai', grandparentName: 'Kul Bahadur Rai' },
  { nidNumber: '5567890123', nameNepali: 'विकास कुमार महर्जन', nameEnglish: 'Bikash Kumar Maharjan', dateOfBirth: '1997-09-14', gender: 'Male', mobileNumber: '9821234567', permanentAddress: { province: 'Bagmati', district: 'Lalitpur', municipality: 'Lalitpur Metropolitan City', ward: '7', tole: 'Pulchowk' }, fatherName: 'Suresh Maharjan', motherName: 'Kamala Maharjan', grandparentName: 'Gopal Maharjan' },
  // 5 additional candidates for richer demo data
  { nidNumber: '6678901234', nameNepali: 'निशा गुरुङ', nameEnglish: 'Nisha Gurung', dateOfBirth: '1996-02-18', gender: 'Female', mobileNumber: '9812345678', permanentAddress: { province: 'Gandaki', district: 'Kaski', municipality: 'Pokhara Metropolitan City', ward: '12', tole: 'Mahendrapul' }, fatherName: 'Ratna Gurung', motherName: 'Laxmi Gurung', grandparentName: 'Prem Gurung' },
  { nidNumber: '7789012345', nameNepali: 'राजेश भण्डारी', nameEnglish: 'Rajesh Bhandari', dateOfBirth: '1994-08-05', gender: 'Male', mobileNumber: '9813456789', permanentAddress: { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: '15', tole: 'Kalanki' }, fatherName: 'Ganesh Bhandari', motherName: 'Sarita Bhandari', grandparentName: 'Hari Bhandari' },
  { nidNumber: '8890123456', nameNepali: 'प्रिया शर्मा', nameEnglish: 'Priya Sharma', dateOfBirth: '1999-05-12', gender: 'Female', mobileNumber: '9814567890', permanentAddress: { province: 'Bagmati', district: 'Chitwan', municipality: 'Bharatpur Metropolitan City', ward: '8', tole: 'Narayangarh' }, fatherName: 'Mohan Sharma', motherName: 'Goma Sharma', grandparentName: 'Ram Sharma' },
  { nidNumber: '9901234567', nameNepali: 'दिपक तामाङ', nameEnglish: 'Deepak Tamang', dateOfBirth: '1995-11-23', gender: 'Male', mobileNumber: '9815678901', permanentAddress: { province: 'Bagmati', district: 'Kavrepalanchok', municipality: 'Banepa Municipality', ward: '5', tole: 'Panauti' }, fatherName: 'Krishna Tamang', motherName: 'Maya Tamang', grandparentName: 'Bir Tamang' },
  { nidNumber: '1012345678', nameNepali: 'सुस्मिता बस्नेत', nameEnglish: 'Sushmita Basnet', dateOfBirth: '1998-01-09', gender: 'Female', mobileNumber: '9816789012', permanentAddress: { province: 'Province No. 1', district: 'Morang', municipality: 'Biratnagar Metropolitan City', ward: '10', tole: 'Tinkune' }, fatherName: 'Damber Basnet', motherName: 'Kamala Basnet', grandparentName: 'Narayan Basnet' },
  // 4 ministry secretaries
  { nidNumber: '9000000001', nameNepali: 'राजेन्द्र प्रसाद शर्मा', nameEnglish: 'Rajendra Prasad Sharma', dateOfBirth: '1970-03-20', gender: 'Male', mobileNumber: '9801111111', permanentAddress: { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: '4', tole: 'Baluwatar' }, fatherName: 'Mukti Prasad Sharma', motherName: 'Laxmi Devi Sharma', grandparentName: 'Hem Prasad Sharma' },
  { nidNumber: '9000000002', nameNepali: 'सुनिता गुरुङ', nameEnglish: 'Sunita Gurung', dateOfBirth: '1972-08-10', gender: 'Female', mobileNumber: '9802222222', permanentAddress: { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: '6', tole: 'Thamel' }, fatherName: 'Tek Bahadur Gurung', motherName: 'Pabitra Gurung', grandparentName: 'Ram Bahadur Gurung' },
  { nidNumber: '9000000003', nameNepali: 'अजय कुमार यादव', nameEnglish: 'Ajay Kumar Yadav', dateOfBirth: '1971-05-05', gender: 'Male', mobileNumber: '9803333333', permanentAddress: { province: 'Madhesh', district: 'Dhanusha', municipality: 'Janakpur Sub-Metropolitan City', ward: '1', tole: 'Ramanand Chowk' }, fatherName: 'Hari Yadav', motherName: 'Radha Yadav', grandparentName: 'Bhola Yadav' },
  { nidNumber: '9000000004', nameNepali: 'मीना तामाङ', nameEnglish: 'Meena Tamang', dateOfBirth: '1968-12-12', gender: 'Female', mobileNumber: '9804444444', permanentAddress: { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: '9', tole: 'Sinamangal' }, fatherName: 'Bishnu Tamang', motherName: 'Maya Tamang', grandparentName: 'Jit Bahadur Tamang' },
  // PSC admin
  { nidNumber: '9999999999', nameNepali: 'डा. प्रेम बहादुर केसी', nameEnglish: 'Dr. Prem Bahadur KC', dateOfBirth: '1965-06-01', gender: 'Male', mobileNumber: '9800000000', permanentAddress: { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: '1', tole: 'Anamnagar' }, fatherName: 'Mohan Bahadur KC', motherName: 'Radha KC', grandparentName: 'Hari Bahadur KC' },
  // MoFAGA + CIAA + OAG admins
  { nidNumber: '8888888888', nameNepali: 'विनोद खतिवडा', nameEnglish: 'Binod Khatiwada', dateOfBirth: '1967-02-14', gender: 'Male', mobileNumber: '9888888888', permanentAddress: { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: '11', tole: 'Singha Durbar' }, fatherName: 'Mani Khatiwada', motherName: 'Ganga Devi Khatiwada', grandparentName: 'Gopal Khatiwada' },
  { nidNumber: '7777777777', nameNepali: 'ईश्वरी पौडेल', nameEnglish: 'Ishwori Paudel', dateOfBirth: '1969-11-20', gender: 'Female', mobileNumber: '9877777777', permanentAddress: { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: '2', tole: 'Tangal' }, fatherName: 'Khadga Paudel', motherName: 'Gita Paudel', grandparentName: 'Narayan Paudel' },
  { nidNumber: '6666666666', nameNepali: 'तारा देवी भट्टराई', nameEnglish: 'Tara Devi Bhattarai', dateOfBirth: '1966-07-08', gender: 'Female', mobileNumber: '9866666666', permanentAddress: { province: 'Bagmati', district: 'Lalitpur', municipality: 'Lalitpur Metropolitan City', ward: '3', tole: 'Lagankhel' }, fatherName: 'Shiva Bhattarai', motherName: 'Parvati Bhattarai', grandparentName: 'Dev Bhattarai' },
  // Pre-seeded existing officers (civil servants already in service — for Phase 6/7 testing)
  { nidNumber: '7000000001', nameNepali: 'गोपाल प्रसाद अधिकारी', nameEnglish: 'Gopal Prasad Adhikari', dateOfBirth: '1980-03-15', gender: 'Male', mobileNumber: '9811111111', permanentAddress: { province: 'Bagmati', district: 'Kathmandu', municipality: 'Kathmandu Metropolitan City', ward: '8', tole: 'Maharajgunj' }, fatherName: 'Kamal Adhikari', motherName: 'Rama Adhikari', grandparentName: 'Hari Adhikari' },
  { nidNumber: '7000000002', nameNepali: 'रोजिना श्रेष्ठ', nameEnglish: 'Rojina Shrestha', dateOfBirth: '1982-06-25', gender: 'Female', mobileNumber: '9822222222', permanentAddress: { province: 'Gandaki', district: 'Kaski', municipality: 'Pokhara Metropolitan City', ward: '7', tole: 'Bagar' }, fatherName: 'Dinesh Shrestha', motherName: 'Nirmala Shrestha', grandparentName: 'Bhim Shrestha' },
  { nidNumber: '7000000003', nameNepali: 'सञ्जय लिम्बू', nameEnglish: 'Sanjay Limbu', dateOfBirth: '1978-10-11', gender: 'Male', mobileNumber: '9833333333', permanentAddress: { province: 'Province No. 1', district: 'Taplejung', municipality: 'Phungling Municipality', ward: '1', tole: 'Phungling Bazar' }, fatherName: 'Mani Limbu', motherName: 'Sita Limbu', grandparentName: 'Bir Bahadur Limbu' }
];

const EXAM_REGISTER_RECORDS = [
  { registrationNumber: 'ERN-2024-001', nidNumber: '1123456789', maximumQualification: 'Master', university: 'Tribhuvan University', faculty: 'Management', stream: 'Public Administration', yearOfCompletion: '2022', percentage: '72%' },
  { registrationNumber: 'ERN-2024-002', nidNumber: '2234567890', maximumQualification: 'Bachelor', university: 'Pokhara University', faculty: 'Science & Technology', stream: 'Computer Science', yearOfCompletion: '2021', percentage: '81%' },
  { registrationNumber: 'ERN-2024-003', nidNumber: '3345678901', maximumQualification: 'Master', university: 'Tribhuvan University', faculty: 'Humanities & Social Science', stream: 'Economics', yearOfCompletion: '2020', percentage: '68%' },
  { registrationNumber: 'ERN-2024-004', nidNumber: '4456789012', maximumQualification: '+2/PCL', university: 'Higher Secondary Education Board', faculty: 'Science', stream: 'Biology', yearOfCompletion: '2019', percentage: '78%' },
  { registrationNumber: 'ERN-2024-005', nidNumber: '5567890123', maximumQualification: 'Bachelor', university: 'Kathmandu University', faculty: 'Engineering', stream: 'Civil Engineering', yearOfCompletion: '2021', percentage: '75%' },
  { registrationNumber: 'ERN-2024-006', nidNumber: '6678901234', maximumQualification: 'Master', university: 'Pokhara University', faculty: 'Management', stream: 'Business Administration', yearOfCompletion: '2022', percentage: '74%' },
  { registrationNumber: 'ERN-2024-007', nidNumber: '7789012345', maximumQualification: 'Master', university: 'Tribhuvan University', faculty: 'Law', stream: 'Constitutional Law', yearOfCompletion: '2021', percentage: '76%' },
  { registrationNumber: 'ERN-2024-008', nidNumber: '8890123456', maximumQualification: 'Bachelor', university: 'Tribhuvan University', faculty: 'Humanities & Social Science', stream: 'International Relations', yearOfCompletion: '2022', percentage: '82%' },
  { registrationNumber: 'ERN-2024-009', nidNumber: '9901234567', maximumQualification: 'Master', university: 'Kathmandu University', faculty: 'Science & Technology', stream: 'Information Technology', yearOfCompletion: '2022', percentage: '79%' },
  { registrationNumber: 'ERN-2024-010', nidNumber: '1012345678', maximumQualification: 'Master', university: 'Tribhuvan University', faculty: 'Humanities & Social Science', stream: 'Political Science', yearOfCompletion: '2022', percentage: '77%' }
];

const POST_RECORDS = [
  { postCode: 'POST-001', postNameEnglish: 'Nayab Subba', postNameNepali: 'नायब सुब्बा', ministry: 'Ministry of Finance', department: 'Department of Revenue', level: 'Rastriya 4', minimumQualification: '+2/PCL', examFee: 1200, totalVacancy: 150, examDate: '2026-06-15', examCenter: 'Kathmandu, Pokhara, Biratnagar' },
  { postCode: 'POST-002', postNameEnglish: 'Kharidar', postNameNepali: 'खरिदार', ministry: 'Ministry of Home Affairs', department: 'District Administration', level: 'Rastriya 4', minimumQualification: 'SLC/SEE', examFee: 1000, totalVacancy: 200, examDate: '2026-06-20', examCenter: 'All Provincial Capitals' },
  { postCode: 'POST-003', postNameEnglish: 'Section Officer', postNameNepali: 'शाखा अधिकृत', ministry: 'General Administration', department: 'Civil Service', level: 'Rastriya 7', minimumQualification: 'Bachelor', examFee: 1500, totalVacancy: 80, examDate: '2026-07-01', examCenter: 'Kathmandu' },
  { postCode: 'POST-004', postNameEnglish: 'Upasachib', postNameNepali: 'उपसचिव', ministry: 'Ministry of General Administration', department: 'Civil Service', level: 'Rastriya 10', minimumQualification: 'Master', examFee: 2000, totalVacancy: 30, examDate: '2026-07-10', examCenter: 'Kathmandu' },
  { postCode: 'POST-005', postNameEnglish: 'Officer (Engineering)', postNameNepali: 'अधिकृत (इन्जिनियरिङ)', ministry: 'Ministry of Physical Infrastructure', department: 'Department of Roads', level: 'Rastriya 7', minimumQualification: 'Bachelor', examFee: 1500, totalVacancy: 45, examDate: '2026-07-05', examCenter: 'Kathmandu, Pokhara' },
  { postCode: 'POST-006', postNameEnglish: 'Nayab Subba (Lekha)', postNameNepali: 'नायब सुब्बा (लेखा)', ministry: 'Ministry of Finance', department: 'Accountant General', level: 'Rastriya 4', minimumQualification: '+2/PCL', examFee: 1200, totalVacancy: 60, examDate: '2026-06-25', examCenter: 'Kathmandu, Birgunj, Dharan' },
  { postCode: 'POST-007', postNameEnglish: 'Administrative Officer', postNameNepali: 'प्रशासन अधिकृत', ministry: 'Ministry of Home Affairs', department: 'Immigration Department', level: 'Rastriya 7', minimumQualification: 'Bachelor', examFee: 1500, totalVacancy: 25, examDate: '2026-07-08', examCenter: 'Kathmandu' }
];

const RESULT_RECORDS = [
  { nidNumber: '1123456789', rollNumber: 'PSC-2026-100001', writtenScore: 82, interviewScore: 18, totalScore: 100, rank: 5, status: 'pass', publishedAt: new Date() },
  { nidNumber: '2234567890', rollNumber: 'PSC-2026-100002', writtenScore: 45, interviewScore: 0, totalScore: 45, rank: 180, status: 'fail', publishedAt: new Date() },
  { nidNumber: '3345678901', rollNumber: 'PSC-2026-100003', writtenScore: 68, interviewScore: 15, totalScore: 83, rank: 12, status: 'waitlist', publishedAt: new Date() },
  // New candidates - all passed for Phase 4 placement demonstration
  { nidNumber: '6678901234', rollNumber: 'PSC-2026-100008', writtenScore: 75, interviewScore: 17, totalScore: 92, rank: 8, status: 'pass', publishedAt: new Date() },
  { nidNumber: '7789012345', rollNumber: 'PSC-2026-100009', writtenScore: 78, interviewScore: 16, totalScore: 94, rank: 7, status: 'pass', publishedAt: new Date() },
  { nidNumber: '8890123456', rollNumber: 'PSC-2026-100010', writtenScore: 80, interviewScore: 17, totalScore: 97, rank: 6, status: 'pass', publishedAt: new Date() },
  { nidNumber: '9901234567', rollNumber: 'PSC-2026-100011', writtenScore: 72, interviewScore: 15, totalScore: 87, rank: 10, status: 'pass', publishedAt: new Date() },
  { nidNumber: '1012345678', rollNumber: 'PSC-2026-100012', writtenScore: 76, interviewScore: 16, totalScore: 92, rank: 9, status: 'pass', publishedAt: new Date() }
];

// Admin users - password for ALL is: admin123
const ADMIN_USERS = [
  { nidNumber: '9000000001', fullName: 'Rajendra Prasad Sharma', plainPassword: 'admin123', roles: ['ministry-secretary'], ministry: 'Ministry of Foreign Affairs', designation: 'Secretary' },
  { nidNumber: '9000000002', fullName: 'Sunita Gurung', plainPassword: 'admin123', roles: ['ministry-secretary'], ministry: 'Ministry of Finance', designation: 'Secretary' },
  { nidNumber: '9000000003', fullName: 'Ajay Kumar Yadav', plainPassword: 'admin123', roles: ['ministry-secretary'], ministry: 'Ministry of Home Affairs', designation: 'Secretary' },
  { nidNumber: '9000000004', fullName: 'Meena Tamang', plainPassword: 'admin123', roles: ['ministry-secretary'], ministry: 'Ministry of Physical Infrastructure', designation: 'Secretary' },
  { nidNumber: '9999999999', fullName: 'Dr. Prem Bahadur KC', plainPassword: 'admin123', roles: ['psc-admin'], ministry: '', designation: 'Chairman, Public Service Commission' },
  // Phase 5/6/7 MoFAGA admin + watchdogs
  { nidNumber: '8888888888', fullName: 'Binod Khatiwada', plainPassword: 'admin123', roles: ['mofaga-admin'], ministry: '', designation: 'Secretary, Ministry of Federal Affairs & General Administration' },
  { nidNumber: '7777777777', fullName: 'Ishwori Paudel', plainPassword: 'admin123', roles: ['ciaa-auditor'], ministry: '', designation: 'Commissioner, Commission for the Investigation of Abuse of Authority' },
  { nidNumber: '6666666666', fullName: 'Tara Devi Bhattarai', plainPassword: 'admin123', roles: ['oag-auditor'], ministry: '', designation: 'Auditor General, Office of the Auditor General' }
];

const MINISTRY_SECTIONS = [
  { sectionName: 'International Relations', ministry: 'Ministry of Foreign Affairs', vacantPositions: 3, educationRequirements: { degreeLevel: 'Master', preferredStream: 'International Relations', preferredSpecialization: 'Policy' }, sector: 'foreign-affairs', locked: true },
  { sectionName: 'Protocol', ministry: 'Ministry of Foreign Affairs', vacantPositions: 2, educationRequirements: { degreeLevel: 'Bachelor', preferredStream: 'Political Science', preferredSpecialization: '' }, sector: 'foreign-affairs', locked: true },
  { sectionName: 'Revenue Policy', ministry: 'Ministry of Finance', vacantPositions: 5, educationRequirements: { degreeLevel: 'Master', preferredStream: 'Economics', preferredSpecialization: 'Public Finance' }, sector: 'finance', locked: true },
  { sectionName: 'Budget Section', ministry: 'Ministry of Finance', vacantPositions: 4, educationRequirements: { degreeLevel: 'Bachelor', preferredStream: 'Economics', preferredSpecialization: '' }, sector: 'finance', locked: true },
  { sectionName: 'Immigration Services', ministry: 'Ministry of Home Affairs', vacantPositions: 3, educationRequirements: { degreeLevel: 'Bachelor', preferredStream: '', preferredSpecialization: '' }, sector: 'general-admin', locked: true }
];

// ==================== PRE-SEEDED APPLICATIONS (Phase 3) ====================
// Candidates have already applied to posts. The existing 3 Results in RESULT_RECORDS
// correspond to the first 3 of these applications. PSC admin can score the rest.
// NOTE: rollNumbers here MUST match the rollNumbers in RESULT_RECORDS where a result exists.
const APPLICATIONS_SEED = [
  // Ram Shrestha (Master, PubAdmin) → Section Officer  [has result PSC-2026-100001]
  { nidNumber: '1123456789', postCode: 'POST-003', rollNumber: 'PSC-2026-100001', paymentMethod: 'eSewa', amount: 1500 },
  // Sita Thapa (Bachelor, CS) → Section Officer       [has result PSC-2026-100002]
  { nidNumber: '2234567890', postCode: 'POST-003', rollNumber: 'PSC-2026-100002', paymentMethod: 'Khalti', amount: 1500 },
  // Krishna Poudel (Master, Econ) → Upasachib         [has result PSC-2026-100003]
  { nidNumber: '3345678901', postCode: 'POST-004', rollNumber: 'PSC-2026-100003', paymentMethod: 'FonePay', amount: 2000 },
  // Anjali Rai (+2, Biology) → Kharidar               (UNSCORED — admin to score)
  { nidNumber: '4456789012', postCode: 'POST-002', rollNumber: 'PSC-2026-100004', paymentMethod: 'eSewa', amount: 1000 },
  // Bikash Maharjan (Bachelor, CivilEng) → Officer (Engineering) (UNSCORED)
  { nidNumber: '5567890123', postCode: 'POST-005', rollNumber: 'PSC-2026-100005', paymentMethod: 'ConnectIPS', amount: 1500 },
  // A few extra so the admin has plenty to score
  { nidNumber: '1123456789', postCode: 'POST-004', rollNumber: 'PSC-2026-100006', paymentMethod: 'eSewa', amount: 2000 },
  { nidNumber: '2234567890', postCode: 'POST-005', rollNumber: 'PSC-2026-100007', paymentMethod: 'Khalti', amount: 1500 },
  // 5 more applications for new candidates (all scored + passed for Phase 4/5 placement demo)
  { nidNumber: '6678901234', postCode: 'POST-003', rollNumber: 'PSC-2026-100008', paymentMethod: 'eSewa', amount: 1500 },
  { nidNumber: '7789012345', postCode: 'POST-004', rollNumber: 'PSC-2026-100009', paymentMethod: 'Khalti', amount: 2000 },
  { nidNumber: '8890123456', postCode: 'POST-003', rollNumber: 'PSC-2026-100010', paymentMethod: 'FonePay', amount: 1500 },
  { nidNumber: '9901234567', postCode: 'POST-007', rollNumber: 'PSC-2026-100011', paymentMethod: 'eSewa', amount: 1500 },
  { nidNumber: '1012345678', postCode: 'POST-003', rollNumber: 'PSC-2026-100012', paymentMethod: 'ConnectIPS', amount: 1500 }
];

// ==================== PRE-SEEDED GRIEVANCES (Phase 3) ====================
const GRIEVANCES_SEED = [
  {
    nidNumber: '2234567890',
    rollNumber: 'PSC-2026-100002',
    type: 'score-challenge',
    subject: 'Written exam Q14 answer re-verification',
    description: 'The expected answer for Question 14 in the Section Officer written paper appears to conflict with the textbook source (Sharma 2022). Requesting re-evaluation of my answer which follows the official syllabus reference.',
    status: 'submitted'
  },
  {
    nidNumber: '3345678901',
    rollNumber: 'PSC-2026-100003',
    type: 'result-dispute',
    subject: 'Interview score clarification',
    description: 'I would like to request a breakdown of my interview scoring. I feel my responses on policy analysis were comprehensive but received only 15/20. Seeking panel feedback.',
    status: 'under-review'
  },
  {
    nidNumber: '4456789012',
    rollNumber: 'PSC-2026-100004',
    type: 'other',
    subject: 'Exam center change request',
    description: 'Due to family medical emergency at Bir Hospital, I request my exam center be changed from Kathmandu to Dhankuta (home district) for the upcoming Kharidar exam.',
    status: 'resolved',
    adminNotes: 'Request approved. Exam center changed to Dhankuta. New admit card has been generated.',
    resolvedAt: new Date()
  }
];

// ==================== PRE-SEEDED PRIORITIES (Phase 4) ====================
// Only the passed candidate (Ram Shrestha - rank 5, roll PSC-2026-100001) has priorities set.
const PRIORITIES_SEED = [
  {
    nidNumber: '1123456789',
    rollNumber: 'PSC-2026-100001',
    priorities: ['Ministry of Foreign Affairs', 'Ministry of Finance', 'Ministry of Home Affairs']
  }
];

// ==================== DISTRICT HARDSHIP TIERS (Phase 6) ====================
const DISTRICT_TIERS = [
  // Tier A — Urban
  { district: 'Kathmandu', province: 'Bagmati', tier: 'A', category: 'urban', description: 'Road access, hospitals, universities, banking' },
  { district: 'Lalitpur', province: 'Bagmati', tier: 'A', category: 'urban', description: 'Metropolitan area adjacent to Kathmandu' },
  { district: 'Bhaktapur', province: 'Bagmati', tier: 'A', category: 'urban', description: 'Historic metropolitan city' },
  { district: 'Kaski', province: 'Gandaki', tier: 'A', category: 'urban', description: 'Pokhara metropolitan area' },
  { district: 'Chitwan', province: 'Bagmati', tier: 'A', category: 'urban', description: 'Bharatpur sub-metropolitan' },
  // Tier B — Semi-accessible
  { district: 'Rupandehi', province: 'Lumbini', tier: 'B', category: 'semi-accessible', description: 'Butwal sub-metro, partial road network' },
  { district: 'Morang', province: 'Province No. 1', tier: 'B', category: 'semi-accessible', description: 'Biratnagar area' },
  { district: 'Dhanusha', province: 'Madhesh', tier: 'B', category: 'semi-accessible', description: 'Janakpur area' },
  { district: 'Dhankuta', province: 'Province No. 1', tier: 'B', category: 'semi-accessible', description: 'Hill district, partial roads' },
  // Tier C — Remote
  { district: 'Taplejung', province: 'Province No. 1', tier: 'C', category: 'remote', description: 'Limited road access, altitude' },
  { district: 'Solukhumbu', province: 'Province No. 1', tier: 'C', category: 'remote', description: 'High-altitude, sparse services' },
  { district: 'Manang', province: 'Gandaki', tier: 'C', category: 'remote', description: 'Trans-Himalayan, very low population density' },
  { district: 'Mustang', province: 'Gandaki', tier: 'C', category: 'remote', description: 'Trans-Himalayan dry zone' },
  // Tier D — Extreme hardship
  { district: 'Humla', province: 'Karnali', tier: 'D', category: 'extreme-hardship', description: 'No motorable road, remote Karnali' },
  { district: 'Mugu', province: 'Karnali', tier: 'D', category: 'extreme-hardship', description: 'Inaccessible remote Karnali' },
  { district: 'Dolpa', province: 'Karnali', tier: 'D', category: 'extreme-hardship', description: 'Highest district by altitude, extremely remote' },
  { district: 'Bajura', province: 'Sudurpaschim', tier: 'D', category: 'extreme-hardship', description: 'Far-western remote zone' }
];
// Civil servants already in service — used for Phase 6/7 testing.
// Tenure start dates are set so Phase 6 auto-flag can find candidates near max tenure.
const OFFICERS_SEED = [
  {
    nidNumber: '7000000001',
    employeeId: 'HRMIS-2080-000101',
    nameEnglish: 'Gopal Prasad Adhikari',
    nameNepali: 'गोपाल प्रसाद अधिकारी',
    dateOfBirth: '1980-03-15',
    gender: 'Male',
    mobileNumber: '9811111111',
    maximumQualification: 'Master',
    university: 'Tribhuvan University',
    faculty: 'Management',
    stream: 'Public Administration',
    currentMinistry: 'Ministry of Finance',
    currentSection: 'Revenue Policy',
    currentDistrictTier: 'A',
    // ~32 months ago — near max 36mo auto-flag for tier A
    tenureStartDaysAgo: 960,
    status: 'active'
  },
  {
    nidNumber: '7000000002',
    employeeId: 'HRMIS-2080-000102',
    nameEnglish: 'Rojina Shrestha',
    nameNepali: 'रोजिना श्रेष्ठ',
    dateOfBirth: '1982-06-25',
    gender: 'Female',
    mobileNumber: '9822222222',
    maximumQualification: 'Bachelor',
    university: 'Pokhara University',
    faculty: 'Science & Technology',
    stream: 'Computer Science',
    currentMinistry: 'Ministry of Home Affairs',
    currentSection: 'Immigration Services',
    currentDistrictTier: 'B',
    tenureStartDaysAgo: 540, // ~18 months
    status: 'active'
  },
  {
    nidNumber: '7000000003',
    employeeId: 'HRMIS-2080-000103',
    nameEnglish: 'Sanjay Limbu',
    nameNepali: 'सञ्जय लिम्बू',
    dateOfBirth: '1978-10-11',
    gender: 'Male',
    mobileNumber: '9833333333',
    maximumQualification: 'Bachelor',
    university: 'Kathmandu University',
    faculty: 'Engineering',
    stream: 'Civil Engineering',
    currentMinistry: 'Ministry of Physical Infrastructure',
    currentSection: 'Roads Division',
    currentDistrictTier: 'C', // remote
    tenureStartDaysAgo: 700, // ~23 months — near max 24mo for tier C
    status: 'active'
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas connected for seeding');

    console.log('🧹 Clearing all collections...');
    await Promise.all([
      NID.deleteMany({}), ExamRegister.deleteMany({}), Candidate.deleteMany({}),
      Post.deleteMany({}), Application.deleteMany({}), Result.deleteMany({}),
      AdminUser.deleteMany({}), MinistrySection.deleteMany({}), Grievance.deleteMany({}),
      Priority.deleteMany({}), PlacementOrder.deleteMany({}), Officer.deleteMany({}),
      DistrictTier.deleteMany({}), TransferQueue.deleteMany({}),
      Appraisal.deleteMany({}), Exemption.deleteMany({}), TransferScore.deleteMany({}),
      TransferWindow.deleteMany({}), TransferOrder.deleteMany({}), Appeal.deleteMany({}),
      AuditEntry.deleteMany({}), CiaaAlert.deleteMany({}), EmergencyTransfer.deleteMany({})
    ]);

    console.log('📥 Inserting NIDs, Exam Registers, Posts...');
    await NID.insertMany(NID_RECORDS);
    await ExamRegister.insertMany(EXAM_REGISTER_RECORDS);
    const insertedPosts = await Post.insertMany(POST_RECORDS);
    const postByCode = new Map(insertedPosts.map((p) => [p.postCode, p]));

    console.log('📥 Inserting Applications (Phase 3)...');
    const applicationDocs = APPLICATIONS_SEED.map((a) => {
      const post = postByCode.get(a.postCode);
      return {
        nidNumber: a.nidNumber,
        postId: post._id,
        rollNumber: a.rollNumber,
        paymentMethod: a.paymentMethod,
        paymentStatus: 'success',
        amount: a.amount,
        examDate: post.examDate,
        examCenter: post.examCenter,
        status: 'appeared'
      };
    });
    await Application.insertMany(applicationDocs);

    console.log('📥 Inserting Results (linked to applications)...');
    // Link existing RESULT_RECORDS to their post by looking up the application
    const rollToPostId = new Map(applicationDocs.map((a) => [a.rollNumber, a.postId]));
    const resultDocs = RESULT_RECORDS.map((r) => ({
      ...r,
      postId: rollToPostId.get(r.rollNumber) || null,
      published: true,
      publishedAt: new Date()
    }));
    await Result.insertMany(resultDocs);

    console.log('📥 Inserting Admin Users (hashed passwords)...');
    const adminDocs = await Promise.all(
      ADMIN_USERS.map(async (u) => ({
        nidNumber: u.nidNumber,
        fullName: u.fullName,
        passwordHash: await bcrypt.hash(u.plainPassword, 10),
        roles: u.roles,
        ministry: u.ministry,
        designation: u.designation,
        dscVerified: true
      }))
    );
    const insertedAdmins = await AdminUser.insertMany(adminDocs);

    console.log('📥 Inserting Ministry Sections (DSC-signed, locked)...');
    const secretaryByMinistry = {};
    insertedAdmins
      .filter((a) => a.roles.includes('ministry-secretary'))
      .forEach((a) => (secretaryByMinistry[a.ministry] = a._id));

    const now = new Date();
    const sectionDocs = MINISTRY_SECTIONS.map((s) => {
      const approverId = secretaryByMinistry[s.ministry];
      const payload = `${s.ministry}|${approverId}|${now.toISOString()}`;
      const dscSignature = crypto.createHash('sha256').update(payload).digest('hex');
      return { ...s, approvedBy: approverId, approvedAt: now, dscSignature, createdBy: approverId };
    });
    await MinistrySection.insertMany(sectionDocs);

    console.log('📥 Inserting Grievances (Phase 3)...');
    const nidLookup = new Map(NID_RECORDS.map((n) => [n.nidNumber, n]));
    const grievanceDocs = GRIEVANCES_SEED.map((g) => {
      const nid = nidLookup.get(g.nidNumber);
      return {
        ...g,
        candidateName: nid?.nameEnglish || '',
        contactMobile: nid?.mobileNumber || '',
        submittedAt: new Date()
      };
    });
    await Grievance.insertMany(grievanceDocs);

    console.log('📥 Inserting Priorities (Phase 4)...');
    await Priority.insertMany(PRIORITIES_SEED);

    console.log('📥 Inserting Officers (Phase 5)...');
    const officerDocs = OFFICERS_SEED.map((o) => {
      const tenureStart = new Date();
      tenureStart.setDate(tenureStart.getDate() - (o.tenureStartDaysAgo || 0));
      const history = [{
        ministry: o.currentMinistry,
        sectionName: o.currentSection,
        startDate: tenureStart,
        districtTier: o.currentDistrictTier
      }];
      return {
        ...o,
        tenureStartDate: tenureStart,
        onboardedAt: tenureStart,
        postingHistory: history
      };
    });
    await Officer.insertMany(officerDocs);

    console.log('📥 Inserting District Tiers (Phase 6)...');
    await DistrictTier.insertMany(DISTRICT_TIERS);

    console.log('📥 Inserting Appraisals + Exemption (Phase 7)...');
    const insertedOfficers = await Officer.find({ nidNumber: { $in: ['7000000001', '7000000002', '7000000003'] } });
    const officerMap = new Map(insertedOfficers.map((o) => [o.nidNumber, o]));

    // 3-year history of appraisals for each pre-seeded officer
    const appraisalDocs = [];
    const fiscalYears = ['2079/80', '2080/81', '2081/82'];
    const ratings = {
      '7000000001': [4, 4, 5], // Gopal - strong performer
      '7000000002': [3, 4, 4], // Rojina - solid
      '7000000003': [5, 5, 4]  // Sanjay - excellent (hardship posting)
    };
    for (const [nid, officer] of officerMap.entries()) {
      for (let i = 0; i < fiscalYears.length; i++) {
        appraisalDocs.push({
          officerId: officer._id,
          nidNumber: nid,
          fiscalYear: fiscalYears[i],
          rating: ratings[nid][i],
          competency: ratings[nid][i],
          integrity: Math.min(ratings[nid][i] + 0, 5),
          initiative: Math.max(ratings[nid][i] - 1, 1),
          punctuality: ratings[nid][i],
          locked: true,
          ratedByName: 'Ministry Secretary',
          countersignedByName: 'MoFAGA',
          countersignedAt: new Date()
        });
      }
    }
    await Appraisal.insertMany(appraisalDocs);

    // One verified exemption for Rojina (medical)
    const rojina = officerMap.get('7000000002');
    if (rojina) {
      await Exemption.create({
        officerId: rojina._id,
        nidNumber: '7000000002',
        type: 'medical',
        description: 'Chronic back condition; specialist treatment required at Kathmandu hospitals. Requesting Kathmandu-area posting.',
        certificateRef: 'HEALTH-REG-2082-00123',
        issuingAuthority: 'Bir Hospital',
        status: 'verified',
        verifiedByName: 'MoFAGA Medical Review Board',
        verifiedAt: new Date()
      });
    }

    const counts = {
      NID: await NID.countDocuments(),
      ExamRegister: await ExamRegister.countDocuments(),
      Candidate: await Candidate.countDocuments(),
      Post: await Post.countDocuments(),
      Application: await Application.countDocuments(),
      Result: await Result.countDocuments(),
      AdminUser: await AdminUser.countDocuments(),
      MinistrySection: await MinistrySection.countDocuments(),
      Grievance: await Grievance.countDocuments(),
      Priority: await Priority.countDocuments(),
      PlacementOrder: await PlacementOrder.countDocuments(),
      Officer: await Officer.countDocuments(),
      DistrictTier: await DistrictTier.countDocuments(),
      TransferQueue: await TransferQueue.countDocuments(),
      Appraisal: await Appraisal.countDocuments(),
      Exemption: await Exemption.countDocuments(),
      TransferScore: await TransferScore.countDocuments(),
      TransferWindow: await TransferWindow.countDocuments(),
      TransferOrder: await TransferOrder.countDocuments(),
      Appeal: await Appeal.countDocuments(),
      AuditEntry: await AuditEntry.countDocuments(),
      CiaaAlert: await CiaaAlert.countDocuments(),
      EmergencyTransfer: await EmergencyTransfer.countDocuments()
    };

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ SEED COMPLETE — Collection counts:');
    console.log('═══════════════════════════════════════════════════');
    Object.entries(counts).forEach(([k, v]) => console.log(`   ${k.padEnd(18)} : ${v}`));
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('Candidate NIDs (OTP login at /login):');
    NID_RECORDS.slice(0, 5).forEach((n) => console.log(`   ${n.nidNumber}  →  ${n.nameEnglish}`));
    console.log('');
    console.log('Admin users (password login at /admin/login — password: admin123):');
    ADMIN_USERS.forEach((a) =>
      console.log(`   ${a.nidNumber}  →  ${a.fullName.padEnd(28)} [${a.roles.join(',')}]  ${a.ministry}`)
    );
    console.log('');
    console.log('Test Results (roll numbers for /results):');
    RESULT_RECORDS.forEach((r) => console.log(`   ${r.rollNumber}  →  ${r.status.toUpperCase()}`));
    console.log('');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
