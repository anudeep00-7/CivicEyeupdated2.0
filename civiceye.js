// civiceye.js - Complete Fixed JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });
    }

    // DOM Elements
    const loader = document.getElementById('loader');
    const appContainer = document.querySelector('.app-container');
    const landingPage = document.getElementById('landing-page');
    const loginModal = document.getElementById('login-modal');

    // API Keys
    const OPENWEATHER_API_KEY = '779b7dc10f0e3713d126315f51a871aa';
    const NEWSDATA_API_KEY = 'pub_1f05459b885f4a9cb8468b85f570f7a1';

    // ===========================
    // FIREBASE CONFIGURATION
    // ===========================
    // Your Firebase project config
    const firebaseConfig = {
        apiKey: "AIzaSyDtzI6cvm0aVxRb56FdiPvKFCFvIZP-eyY",
        authDomain: "team-b2w.firebaseapp.com",
        projectId: "team-b2w",
        storageBucket: "team-b2w.firebasestorage.app",
        messagingSenderId: "748132428944",
        appId: "1:748132428944:web:3bb40586810dae0a3c3c15",
        measurementId: "G-PJW5SZD8WK"
    };

    // Initialize Firebase
    let firebaseApp = null;
    let auth = null;
    let db = null;
    let storage = null;
    let googleProvider = null;

    try {
        if (typeof firebase !== 'undefined') {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            storage = firebase.storage();
            googleProvider = new firebase.auth.GoogleAuthProvider();
            googleProvider.addScope('profile');
            googleProvider.addScope('email');
            console.log('Firebase initialized successfully');
        } else {
            console.warn('Firebase SDK not loaded');
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }

    // Sign-up Modal Element
    const signupModal = document.getElementById('signup-modal');

    // Global State (Simulated Backend Data)
    let currentUser = null;
    let currentTheme = localStorage.getItem('theme') || 'dark';
    let map = null;
    let userLocation = { lat: 13.6333, lng: 79.4167 }; // Default to Tirupati
    let allReports = [
        {
            id: 1,
            title: "Canteen Idly Turns to Stone After 8:00 AM",
            description: "Students report the breakfast delicacy achieving rock-like density as time passes.",
            photo: "https://via.placeholder.com/150",
            lat: 13.6212,
            lng: 79.4150,
            username: "user",
            votes: 405,
            status: "pending",
            comments: [],
            category: "food",
            createdAt: new Date('2025-10-14T09:00:00Z').toISOString(),
            voters: []
        },
        {
            id: 2,
            title: "Wi-Fi Speed Drops When Faculty Walks By",
            description: "Unexplained electromagnetic phenomena occur every time a lecturer passes the router.",
            photo: "https://via.placeholder.com/150",
            lat: 13.6190,
            lng: 79.4121,
            username: "user",
            votes: 400,
            status: "pending",
            comments: [],
            category: "infrastructure",
            createdAt: new Date('2025-10-13T15:30:00Z').toISOString(),
            voters: []
        },
        // More sample reports can be added here
    ];
    let usersData = [
        {
            username: 'user',
            password: 'password',
            role: 'user',
            karma: 100
        },
        {
            username: 'admin',
            password: 'adminpassword',
            role: 'admin',
            karma: 999
        },
        {
            username: 'TirupatiGreenFoundation',
            password: 'ngo_password',
            role: 'ngo'
        }
    ];
    let ngosData = [
        {
            name: "Tirupati Green Foundation",
            description: "A local NGO focused on tree plantation, waste segregation, and climate awareness.",
            contact: "info@tirupatigreen.org",
            contactPerson: "Suresh Reddy",
            username: "TirupatiGreenFoundation"
        }
    ];

    let uploadedPhotos = [];
    let userProfile = null;
    let addressMarker = null;
    let manualCoordinates = null;

    // Utility to generate unique ID
    const generateId = () => Date.now() + Math.floor(Math.random() * 1000);

    // Initialize App
    async function initApp() {
        showLoader();
        setAppTheme(currentTheme);

        // Check if user was previously logged in
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                currentUser = JSON.parse(savedUser);
                await loginSuccess();
            } catch (error) {
                console.log('No saved login found');
                localStorage.removeItem('currentUser');
            }
        }

        setupEventListeners();
        getUserLocation();
        hideLoader();
    }

    // Setup Event Listeners
    function setupEventListeners() {
        // Landing page buttons
        document.getElementById('nav-login').addEventListener('click', showLoginModal);
        document.getElementById('nav-get-started').addEventListener('click', showLoginModal);
        document.getElementById('hero-report').addEventListener('click', showLoginModal);
        document.getElementById('hero-browse').addEventListener('click', () => {
            showLoginModal();
            localStorage.setItem('redirectAfterLogin', 'issues-view');
        });

        // Login modal
        document.getElementById('close-login').addEventListener('click', hideLoginModal);
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) hideLoginModal();
        });

        // Login forms
        document.getElementById('user-login-form').addEventListener('submit', handleUserLogin);
        document.getElementById('ngo-login-form').addEventListener('submit', handleNGOLogin);

        // Login tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                switchLoginTab(tab);
            });
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

        // Report form
        document.getElementById('report-form').addEventListener('submit', handleReportSubmit);

        // Photo upload
        document.getElementById('upload-area').addEventListener('click', () => {
            document.getElementById('photo-input').click();
        });
        document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);

        // News tabs
        document.addEventListener('click', function (e) {
            if (e.target.classList.contains('news-tab')) {
                const category = e.target.dataset.category;
                loadNews(category);
            }

            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                displayAllIssues();
            }

            if (e.target.classList.contains('admin-tab')) {
                const tab = e.target.dataset.tab;
                switchAdminTab(tab);
            }
        });

        // Sort select
        document.getElementById('sort-select').addEventListener('change', displayAllIssues);

        // ===========================
        // SIGN-UP EVENT LISTENERS
        // ===========================

        // Sign-up modal controls
        if (signupModal) {
            document.getElementById('close-signup').addEventListener('click', hideSignUpModal);
            signupModal.addEventListener('click', (e) => {
                if (e.target === signupModal) hideSignUpModal();
            });
        }

        // Switch between login and signup modals
        const showSignupLink = document.getElementById('show-signup-link');
        const showLoginLink = document.getElementById('show-login-link');

        if (showSignupLink) {
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                hideLoginModal();
                showSignUpModal();
            });
        }

        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                hideSignUpModal();
                showLoginModal();
            });
        }

        // Sign-up tabs
        document.querySelectorAll('.signup-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.closest('.signup-tab-btn').dataset.signupTab;
                switchSignUpTab(tab);
            });
        });

        // Sign-up form submissions
        const userSignupForm = document.getElementById('user-signup-form');
        const ngoSignupForm = document.getElementById('ngo-signup-form');

        if (userSignupForm) {
            userSignupForm.addEventListener('submit', handleUserSignUp);
        }

        if (ngoSignupForm) {
            ngoSignupForm.addEventListener('submit', handleNGOSignUp);
        }

        // Google Sign-Up buttons
        const googleUserBtn = document.getElementById('google-signup-user');
        const googleNgoBtn = document.getElementById('google-signup-ngo');

        if (googleUserBtn) {
            googleUserBtn.addEventListener('click', () => handleGoogleSignUp('user'));
        }

        if (googleNgoBtn) {
            googleNgoBtn.addEventListener('click', () => handleGoogleSignUp('ngo'));
        }
    }

    // Login Functions
    function showLoginModal() {
        loginModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function hideLoginModal() {
        loginModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function switchLoginTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.login-form').forEach(form => form.classList.remove('active'));

        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-form`).classList.add('active');
    }

    async function handleUserLogin(e) {
        e.preventDefault();
        await performLogin('user');
    }

    async function handleNGOLogin(e) {
        e.preventDefault();
        await performLogin('ngo');
    }

    async function performLogin(role) {
        showLoader();

        const username = role === 'user'
            ? document.getElementById('username-input').value.trim()
            : document.getElementById('ngo-username').value.trim();

        const password = role === 'user'
            ? document.getElementById('password-input').value
            : document.getElementById('ngo-password').value;

        // First try Firebase Auth login
        if (auth) {
            try {
                // Try signing in with email/password
                const userCredential = await auth.signInWithEmailAndPassword(username, password);
                const user = userCredential.user;

                // Try to fetch user role from Firestore (non-blocking if fails)
                let userData = {};
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    userData = userDoc.exists ? userDoc.data() : {};
                } catch (firestoreError) {
                    console.warn('Firestore read failed:', firestoreError);
                    // Continue with default role
                }

                currentUser = {
                    username: userData.displayName || user.displayName || user.email,
                    email: user.email,
                    role: userData.role || role,
                    uid: user.uid,
                    photoURL: user.photoURL || userData.photoURL,
                    karma: userData.karma || 0
                };

                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showNotification(`Welcome back, ${currentUser.username}!`, 'success');
                await loginSuccess();
                hideLoader();
                return;

            } catch (firebaseError) {
                console.error('Firebase login error:', firebaseError.code, firebaseError.message);

                // Show specific Firebase error messages
                let errorMsg = 'Invalid credentials. Please try again.';
                if (firebaseError.code === 'auth/user-not-found') {
                    errorMsg = 'No account found with this email. Please sign up first.';
                } else if (firebaseError.code === 'auth/wrong-password') {
                    errorMsg = 'Incorrect password. Please try again.';
                } else if (firebaseError.code === 'auth/invalid-email') {
                    errorMsg = 'Invalid email format.';
                } else if (firebaseError.code === 'auth/too-many-requests') {
                    errorMsg = 'Too many failed attempts. Please try again later.';
                } else if (firebaseError.code === 'auth/invalid-credential') {
                    errorMsg = 'Invalid email or password. Please check and try again.';
                }

                showNotification(errorMsg, 'error');
                hideLoader();
                return;
            }
        }

        // Fallback: Check mock users (for demo: user/password, admin/adminpassword, etc.)
        const mockUser = usersData.find(u => u.username === username && u.password === password);

        if (mockUser) {
            currentUser = mockUser;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            await loginSuccess();
        } else {
            showNotification('Invalid credentials. Please try again.', 'error');
        }

        hideLoader();
    }

    async function loginSuccess() {
        hideLoginModal();
        landingPage.style.display = 'none';
        appContainer.style.display = 'block';

        // Load initial data from localStorage
        allReports = getReportsFromLocalStorage();

        // Then load/merge from Firestore
        await loadIssuesFromFirestore();

        userProfile = getUserProfile(currentUser.username);

        // Update UI based on user role
        updateHeader();
        setupNavigation();
        updateDashboardStats();

        // Load weather and news
        loadWeather();
        loadNews('local');

        // Show appropriate view
        const redirectView = localStorage.getItem('redirectAfterLogin');
        if (redirectView) {
            showView(redirectView);
            localStorage.removeItem('redirectAfterLogin');
        } else {
            showView('dashboard-view');
        }

        // Initialize map if needed
        if (document.getElementById('issues-map')) {
            initializeMap();
        }
    }

    // ===========================
    // SIGN-UP FUNCTIONS
    // ===========================

    function showSignUpModal() {
        if (signupModal) {
            signupModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function hideSignUpModal() {
        if (signupModal) {
            signupModal.classList.remove('active');
            document.body.style.overflow = '';
            // Reset forms
            document.getElementById('user-signup-form')?.reset();
            document.getElementById('ngo-signup-form')?.reset();
        }
    }

    function switchSignUpTab(tab) {
        document.querySelectorAll('.signup-tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.signup-form').forEach(form => form.classList.remove('active'));

        document.querySelector(`[data-signup-tab="${tab}"]`)?.classList.add('active');
        document.getElementById(`${tab}-form`)?.classList.add('active');
    }

    // Validate sign-up form
    function validateSignUpForm(formType) {
        let isValid = true;
        let errorMessage = '';

        if (formType === 'user') {
            const fullName = document.getElementById('user-fullname').value.trim();
            const email = document.getElementById('user-email').value.trim();
            const password = document.getElementById('user-password').value;
            const confirmPassword = document.getElementById('user-confirm-password').value;

            if (!fullName) {
                errorMessage = 'Please enter your full name.';
                isValid = false;
            } else if (!email || !isValidEmail(email)) {
                errorMessage = 'Please enter a valid email address.';
                isValid = false;
            } else if (password.length < 6) {
                errorMessage = 'Password must be at least 6 characters.';
                isValid = false;
            } else if (password !== confirmPassword) {
                errorMessage = 'Passwords do not match.';
                isValid = false;
            }
        } else if (formType === 'ngo') {
            const orgName = document.getElementById('ngo-org-name').value.trim();
            const email = document.getElementById('ngo-email').value.trim();
            const password = document.getElementById('ngo-signup-password').value;
            const confirmPassword = document.getElementById('ngo-confirm-password').value;
            const city = document.getElementById('ngo-city').value.trim();
            const category = document.getElementById('ngo-category').value;

            if (!orgName) {
                errorMessage = 'Please enter your organization name.';
                isValid = false;
            } else if (!email || !isValidEmail(email)) {
                errorMessage = 'Please enter a valid email address.';
                isValid = false;
            } else if (password.length < 6) {
                errorMessage = 'Password must be at least 6 characters.';
                isValid = false;
            } else if (password !== confirmPassword) {
                errorMessage = 'Passwords do not match.';
                isValid = false;
            } else if (!city) {
                errorMessage = 'Please enter your city/location.';
                isValid = false;
            } else if (!category) {
                errorMessage = 'Please select an NGO category.';
                isValid = false;
            }
        }

        if (!isValid) {
            showNotification(errorMessage, 'error');
        }

        return isValid;
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Handle User Sign-Up
    async function handleUserSignUp(e) {
        e.preventDefault();

        if (!validateSignUpForm('user')) return;
        if (!auth) {
            showNotification('Firebase is not configured. Please add your Firebase credentials.', 'error');
            return;
        }

        const fullName = document.getElementById('user-fullname').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const password = document.getElementById('user-password').value;

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // Create user with Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update display name
            await user.updateProfile({ displayName: fullName });

            // Try to store role metadata in Firestore (non-blocking if it fails)
            try {
                await db.collection('users').doc(user.uid).set({
                    role: 'user',
                    displayName: fullName,
                    email: email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (firestoreError) {
                console.warn('Firestore write failed (user role not stored):', firestoreError);
                // Continue anyway - Auth succeeded
            }

            // Also add to local usersData for compatibility
            usersData.push({
                username: fullName,
                email: email,
                role: 'user',
                karma: 0,
                uid: user.uid
            });

            showNotification('Account created successfully! Please login with your email.', 'success');
            hideSignUpModal();
            showLoginModal();

        } catch (error) {
            console.error('User sign-up error:', error);
            let errorMsg = 'Sign-up failed. Please try again.';
            if (error.code === 'auth/email-already-in-use') {
                errorMsg = 'This email is already registered. Please login instead.';
            } else if (error.code === 'auth/weak-password') {
                errorMsg = 'Password is too weak. Please use a stronger password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'Invalid email address format.';
            }
            showNotification(errorMsg, 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    // Handle NGO Sign-Up
    async function handleNGOSignUp(e) {
        e.preventDefault();

        if (!validateSignUpForm('ngo')) return;
        if (!auth) {
            showNotification('Firebase is not configured. Please add your Firebase credentials.', 'error');
            return;
        }

        const orgName = document.getElementById('ngo-org-name').value.trim();
        const email = document.getElementById('ngo-email').value.trim();
        const password = document.getElementById('ngo-signup-password').value;
        const city = document.getElementById('ngo-city').value.trim();
        const category = document.getElementById('ngo-category').value;

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        try {
            // Create user with Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update display name
            await user.updateProfile({ displayName: orgName });

            // Try to store role metadata in Firestore (non-blocking if it fails)
            try {
                await db.collection('users').doc(user.uid).set({
                    role: 'ngo',
                    displayName: orgName,
                    organizationName: orgName,
                    email: email,
                    city: city,
                    category: category,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (firestoreError) {
                console.warn('Firestore write failed (NGO role not stored):', firestoreError);
                // Continue anyway - Auth succeeded
            }

            // Also add to local ngosData and usersData for compatibility
            ngosData.push({
                name: orgName,
                description: `NGO based in ${city}`,
                contact: email,
                contactPerson: orgName,
                username: orgName,
                category: category
            });

            usersData.push({
                username: orgName,
                email: email,
                role: 'ngo',
                uid: user.uid
            });

            showNotification('NGO account created successfully! Please login with your email.', 'success');
            hideSignUpModal();
            showLoginModal();

        } catch (error) {
            console.error('NGO sign-up error:', error);
            let errorMsg = 'Sign-up failed. Please try again.';
            if (error.code === 'auth/email-already-in-use') {
                errorMsg = 'This email is already registered. Please login instead.';
            } else if (error.code === 'auth/weak-password') {
                errorMsg = 'Password is too weak. Please use a stronger password.';
            } else if (error.code === 'auth/invalid-email') {
                errorMsg = 'Invalid email address format.';
            }
            showNotification(errorMsg, 'error');
        } finally {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    // Handle Google Sign-Up
    async function handleGoogleSignUp(role) {
        if (!auth || !googleProvider) {
            showNotification('Firebase is not configured. Please add your Firebase credentials.', 'error');
            return;
        }

        const googleBtn = document.getElementById(`google-signup-${role}`);
        if (googleBtn) {
            googleBtn.classList.add('loading');
            googleBtn.disabled = true;
        }

        try {
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;

            // Check if user already exists in Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                // New user - create document with role
                const userData = {
                    role: role,
                    displayName: user.displayName || 'User',
                    email: user.email,
                    photoURL: user.photoURL || null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (role === 'ngo') {
                    userData.organizationName = user.displayName || 'Organization';
                    userData.city = '';
                    userData.category = '';
                }

                await db.collection('users').doc(user.uid).set(userData);

                // Add to local data
                if (role === 'ngo') {
                    ngosData.push({
                        name: user.displayName,
                        description: 'NGO registered via Google',
                        contact: user.email,
                        contactPerson: user.displayName,
                        username: user.displayName
                    });
                }

                usersData.push({
                    username: user.displayName,
                    email: user.email,
                    role: role,
                    karma: 0,
                    uid: user.uid,
                    photoURL: user.photoURL
                });

                showNotification(`Account created as ${role}! Welcome, ${user.displayName}!`, 'success');
            } else {
                showNotification(`Welcome back, ${user.displayName}!`, 'success');
            }

            // Set current user
            const firestoreData = userDoc.exists ? userDoc.data() : { role: role };
            currentUser = {
                username: user.displayName,
                email: user.email,
                role: firestoreData.role || role,
                uid: user.uid,
                photoURL: user.photoURL,
                karma: 0
            };

            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            hideSignUpModal();
            await loginSuccess();

        } catch (error) {
            console.error('Google sign-up error:', error);
            let errorMsg = 'Google sign-up failed. Please try again.';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMsg = 'Sign-up cancelled. Please try again.';
            } else if (error.code === 'auth/popup-blocked') {
                errorMsg = 'Pop-up was blocked. Please allow pop-ups and try again.';
            }
            showNotification(errorMsg, 'error');
        } finally {
            if (googleBtn) {
                googleBtn.classList.remove('loading');
                googleBtn.disabled = false;
            }
        }
    }

    // Firebase Auth State Observer (for persistence)
    if (auth) {
        auth.onAuthStateChanged(async (user) => {
            if (user && !currentUser) {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        currentUser = {
                            username: userData.displayName || user.displayName,
                            email: user.email,
                            role: userData.role || 'user',
                            uid: user.uid,
                            photoURL: user.photoURL || userData.photoURL,
                            karma: userData.karma || 0
                        };
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            }
        });
    }

    // In-memory "database" functions
    function getReportsFromLocalStorage() {
        const storedReports = localStorage.getItem('allReports');
        return storedReports ? JSON.parse(storedReports) : allReports;
    }

    // Load issues from Firestore and merge with local data
    async function loadIssuesFromFirestore() {
        if (!db) return;

        try {
            const snapshot = await db.collection('issues')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            if (!snapshot.empty) {
                const firestoreIssues = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
                }));

                // Merge with existing local issues (avoid duplicates)
                const localIds = new Set(allReports.map(r => String(r.id)));
                const newFromFirestore = firestoreIssues.filter(issue => !localIds.has(issue.id));

                // Update local issues with Firestore data and add new ones
                firestoreIssues.forEach(firestoreIssue => {
                    const localIndex = allReports.findIndex(r => String(r.id) === firestoreIssue.id);
                    if (localIndex !== -1) {
                        // Update local with Firestore data (Firestore is source of truth)
                        allReports[localIndex] = { ...allReports[localIndex], ...firestoreIssue };
                    }
                });

                allReports = [...newFromFirestore, ...allReports];
                saveReportsToLocalStorage();
                console.log(`Loaded ${firestoreIssues.length} issues from Firestore`);
            }
        } catch (error) {
            console.error('Error loading issues from Firestore:', error);
        }
    }

    function saveReportsToLocalStorage() {
        localStorage.setItem('allReports', JSON.stringify(allReports));
    }

    function getUserProfile(username) {
        const user = usersData.find(u => u.username === username);
        const userReports = allReports.filter(r => r.username === username);
        return {
            ...user,
            totalReports: userReports.length,
            resolvedReports: userReports.filter(r => r.status === 'resolved').length
        };
    }

    // Weather and News Functions - now direct API calls
    async function loadWeather() {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${userLocation.lat}&lon=${userLocation.lng}&appid=${OPENWEATHER_API_KEY}&units=metric`);
            const data = await response.json();

            if (response.ok) {
                document.getElementById('weather-temp').textContent = `${Math.round(data.main.temp)}°C`;
                document.getElementById('weather-desc').textContent = data.weather[0].description;
                document.getElementById('weather-wind').textContent = `${data.wind.speed} m/s`;
                document.getElementById('weather-humidity').textContent = `${data.main.humidity}%`;
                const weatherIcon = document.getElementById('weather-icon');
                weatherIcon.textContent = getWeatherEmoji(data.weather[0].icon);
                document.querySelector('.weather-card h3').innerHTML = `<i class="fas fa-cloud-sun"></i> Weather in ${data.name}`;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading weather:', error);
            document.getElementById('weather-desc').textContent = 'Weather unavailable';
        }
    }

    function getWeatherEmoji(iconCode) {
        const emojiMap = {
            '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️',
            '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
            '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌦️',
            '11d': '⛈️', '11n': '⛈️', '13d': '🌨️', '13n': '🌨️',
            '50d': '🌫️', '50n': '🌫️'
        };
        return emojiMap[iconCode] || '🌤️';
    }

    async function loadNews(category) {
        try {
            let query = 'india';
            if (category === 'world') {
                query = 'world';
            }
            const response = await fetch(`https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&q=${query}&language=en`);
            const data = await response.json();
            const newsContainer = document.getElementById('news-content');

            if (response.ok && data.results && data.results.length > 0) {
                const newsData = data.results.slice(0, 5).map(article => ({
                    title: article.title,
                    description: article.description || 'No description available',
                    source: article.source_id || 'Unknown Source',
                    publishedAt: article.pubDate,
                    url: article.link,
                    image: article.image_url
                }));

                newsContainer.innerHTML = newsData.map(news => `
                    <div class="news-item" onclick="window.open('${news.url || '#'}', '_blank')" style="cursor: pointer;">
                        ${news.image ? `<img src="${news.image}" alt="News image" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">` : ''}
                        <h4>${news.title || 'No title'}</h4>
                        <p>${news.description || 'No description available'}</p>
                        <div class="news-meta">
                            <span>${news.source || 'Unknown Source'}</span>
                            <span>•</span>
                            <span>${new Date(news.publishedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                newsContainer.innerHTML = '<p class="no-issues">No news available at the moment.</p>';
            }

            document.querySelectorAll('.news-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelector(`[data-category="${category}"]`).classList.add('active');
        } catch (error) {
            console.error('Error loading news:', error);
            document.getElementById('news-content').innerHTML = '<p class="no-issues">Failed to load news.</p>';
        }
    }

    // Navigation Functions
    function setupNavigation() {
        const mainNav = document.getElementById('main-nav');
        mainNav.innerHTML = '';
        const navItems = [
            { id: 'dashboard-nav', text: 'Dashboard', view: 'dashboard-view', icon: 'fas fa-home', roles: ['user', 'admin', 'ngo'] },
            { id: 'issues-nav', text: 'Issues', view: 'issues-view', icon: 'fas fa-list', roles: ['user', 'admin', 'ngo'] },
            { id: 'submit-nav', text: 'Report Issue', view: 'submit-view', icon: 'fas fa-plus', roles: ['user', 'admin'] }
        ];
        if (currentUser.role === 'user' || currentUser.role === 'admin') {
            navItems.push({ id: 'profile-nav', text: 'My Profile', view: 'profile-view', icon: 'fas fa-user', roles: ['user', 'admin'] });
        }
        if (currentUser.role === 'admin') {
            navItems.push({ id: 'admin-nav', text: 'Admin', view: 'admin-dashboard-view', icon: 'fas fa-cog', roles: ['admin'] });
        }
        if (currentUser.role === 'ngo') {
            navItems.push({ id: 'ngo-nav', text: 'NGO Dashboard', view: 'ngo-dashboard-view', icon: 'fas fa-hands-helping', roles: ['ngo'] });
        }
        navItems.filter(item => item.roles.includes(currentUser.role)).forEach(item => {
            const button = document.createElement('button');
            button.className = 'nav-item';
            button.type = 'button';
            button.innerHTML = `<i class="${item.icon}"></i> ${item.text}`;
            button.addEventListener('click', () => showView(item.view));
            mainNav.appendChild(button);
        });
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'nav-item';
        logoutBtn.type = 'button';
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        logoutBtn.addEventListener('click', logout);
        mainNav.appendChild(logoutBtn);
    }

    function showView(viewId) {
        document.querySelectorAll('.view-container').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const targetView = document.getElementById(viewId);
        if (targetView) targetView.classList.add('active');
        const navItem = document.querySelector(`[data-view="${viewId}"]`);
        if (navItem) navItem.classList.add('active');
        switch (viewId) {
            case 'dashboard-view':
                updateDashboardStats();
                displayRecentIssues();
                if (map) updateMapMarkers();
                break;
            case 'issues-view':
                displayAllIssues();
                break;
            case 'submit-view':
                initializeReportForm();
                break;
            case 'profile-view':
                displayProfile();
                break;
            case 'ngo-dashboard-view':
                displayNGODashboard();
                break;
            case 'admin-dashboard-view':
                displayAdminDashboard();
                break;
        }
    }
    window.showView = showView;

    function logout() {
        currentUser = null;
        uploadedPhotos = [];
        localStorage.removeItem('currentUser');
        localStorage.removeItem('redirectAfterLogin');
        appContainer.style.display = 'none';
        landingPage.style.display = 'block';
        document.querySelector('#main-nav').innerHTML = '';
        document.querySelector('#user-info').innerHTML = '';
        showNotification('You have been logged out.', 'info');
    }

    function setAppTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        currentTheme = theme;
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    function toggleTheme() {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setAppTheme(newTheme);
    }

    function updateHeader() {
        const userInfo = document.getElementById('user-info');
        if (currentUser) {
            userInfo.innerHTML = `
                <div class="user-avatar"><i class="fas fa-user"></i></div>
                <div class="user-details">
                    <div class="user-name">${currentUser.username}</div>
                    <div class="user-role">${currentUser.role.toUpperCase()}</div>
                    ${currentUser.karma ? `<div class="user-karma">Karma: ${currentUser.karma}</div>` : ''}
                </div>
            `;
        }
    }

    function updateDashboardStats() {
        const pendingCount = allReports.filter(r => r.status === 'pending').length;
        const progressCount = allReports.filter(r => r.status === 'inprogress').length;
        const resolvedCount = allReports.filter(r => r.status === 'resolved').length;
        document.getElementById('pending-count').textContent = pendingCount;
        document.getElementById('progress-count').textContent = progressCount;
        document.getElementById('resolved-count').textContent = resolvedCount;
    }

    function displayRecentIssues() {
        const container = document.getElementById('recent-issues-container');
        const recentIssues = [...allReports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        if (recentIssues.length === 0) {
            container.innerHTML = '<p class="no-issues">No issues reported yet.</p>';
            return;
        }
        container.innerHTML = recentIssues.map(issue => {
            const voterIdentifier = currentUser.uid || currentUser.username;
            const hasVoted = issue.voters && issue.voters.includes(voterIdentifier);
            // Escape the issue ID for use in HTML attributes
            const escapedId = String(issue.id).replace(/'/g, "\\'");
            return `
            <div class="issue-card">
                <div class="issue-header">
                    <h3 class="issue-title">${issue.title}</h3>
                    <span class="status-badge status-${issue.status}">${issue.status}</span>
                </div>
                <div class="issue-meta">
                    <span><i class="fas fa-user"></i> ${issue.username}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(issue.createdAt).toLocaleDateString()}</span>
                    <span><i class="fas fa-thumbs-up"></i> ${issue.votes || 0} votes</span>
                </div>
                <p class="issue-description">${issue.description}</p>
                <div class="issue-actions">
                    <button type="button" class="vote-btn ${hasVoted ? 'active' : ''}" onclick="upvoteIssue('${escapedId}', event)">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${issue.votes || 0}</span>
                    </button>
                    <button type="button" class="comment-btn" onclick="showComments('${escapedId}', event)">
                        <i class="fas fa-comment"></i>
                        <span>${issue.comments ? issue.comments.length : 0}</span>
                    </button>
                </div>
            </div>
            `;
        }).join('');
    }

    window.upvoteIssue = async function (issueId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!currentUser) {
            showNotification('Please log in to vote.', 'error');
            return;
        }

        // Handle both string and numeric IDs
        const issue = allReports.find(r => String(r.id) === String(issueId));
        if (!issue) {
            console.error('Issue not found for ID:', issueId);
            showNotification('Issue not found.', 'error');
            return;
        }

        const voters = issue.voters || [];
        const voterIdentifier = currentUser.uid || currentUser.username;
        const userIndex = voters.indexOf(voterIdentifier);

        if (userIndex === -1) {
            issue.votes = (issue.votes || 0) + 1;
            issue.voters = [...voters, voterIdentifier];
            currentUser.karma = (currentUser.karma || 0) + 1;
            showNotification('Vote recorded! +1 Karma', 'success');
        } else {
            issue.votes = Math.max(0, (issue.votes || 0) - 1);
            issue.voters = voters.filter((_, i) => i !== userIndex);
            currentUser.karma = Math.max(0, (currentUser.karma || 0) - 1);
            showNotification('Vote removed!', 'info');
        }

        // Sync with Firestore (for issues with string IDs from Firestore)
        if (db && issue.id) {
            try {
                // Check if this issue exists in Firestore before updating
                const docRef = db.collection('issues').doc(String(issue.id));
                const docSnap = await docRef.get();

                if (docSnap.exists) {
                    await docRef.update({
                        votes: issue.votes,
                        voters: issue.voters
                    });
                    console.log('Vote synced to Firestore for issue:', issue.id);
                }
            } catch (firestoreError) {
                console.error('Firestore vote update error:', firestoreError);
            }
        }

        saveReportsToLocalStorage();
        refreshCurrentView();
    };

    function displayAllIssues() {
        const sortBy = document.getElementById('sort-select').value;
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        let issues = [...allReports];
        if (activeFilter !== 'all') {
            issues = issues.filter(issue => issue.status === activeFilter);
        }
        if (sortBy === 'recent') {
            issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortBy === 'voted') {
            issues.sort((a, b) => b.votes - a.votes);
        }
        const container = document.getElementById('issues-feed-container');
        if (issues.length === 0) {
            container.innerHTML = '<p class="no-issues">No issues found.</p>';
            return;
        }
        container.innerHTML = issues.map(issue => {
            const voterIdentifier = currentUser.uid || currentUser.username;
            const hasVoted = issue.voters && issue.voters.includes(voterIdentifier);
            // Escape the issue ID for use in HTML attributes
            const escapedId = String(issue.id).replace(/'/g, "\\'");
            return `
            <div class="issue-card">
                <div class="issue-header">
                    <h3 class="issue-title">${issue.title}</h3>
                    <span class="status-badge status-${issue.status}">${issue.status}</span>
                </div>
                <div class="issue-meta">
                    <span><i class="fas fa-user"></i> ${issue.username}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(issue.createdAt).toLocaleDateString()}</span>
                    <span><i class="fas fa-tag"></i> ${issue.category || 'General'}</span>
                </div>
                <p class="issue-description">${issue.description}</p>
                ${issue.photo && issue.photo !== 'https://via.placeholder.com/150' ? `<img src="${issue.photo}" alt="Issue photo" class="issue-image">` : ''}
                <div class="issue-actions">
                    <button type="button" class="vote-btn ${hasVoted ? 'active' : ''}" onclick="upvoteIssue('${escapedId}', event)">
                        <i class="fas fa-thumbs-up"></i>
                        <span>${issue.votes || 0}</span>
                    </button>
                    <button type="button" class="comment-btn" onclick="showComments('${escapedId}', event)">
                        <i class="fas fa-comment"></i>
                        <span>${issue.comments ? issue.comments.length : 0}</span>
                    </button>
                    ${currentUser.role === 'admin' ? `
                    <button type="button" class="btn-info" onclick="showAdminOptions('${escapedId}', event)">
                        <i class="fas fa-cog"></i>
                    </button>` : ''}
                </div>
            </div>
            `;
        }).join('');
    }

    function initializeMap() {
        if (!map && document.getElementById('issues-map')) {
            map = L.map('issues-map').setView([13.6333, 79.4167], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
            updateMapMarkers();
        }
    }

    function updateMapMarkers() {
        if (!map) return;
        map.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        allReports.forEach(report => {
            if (report.lat && report.lng) {
                const markerColor = getMarkerColor(report.status);
                const customIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color: ${markerColor}; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">!</div>`,
                    iconSize: [30, 42],
                    iconAnchor: [15, 42],
                });
                L.marker([report.lat, report.lng], { icon: customIcon }).addTo(map).bindPopup(`<b>${report.title}</b><br>${report.description}<br>Status: <span class="status-${report.status}">${report.status}</span>`);
            }
        });
    }

    function getMarkerColor(status) {
        switch (status) {
            case 'pending': return '#ef4444';
            case 'inprogress': return '#f59e0b';
            case 'resolved': return '#10b981';
            default: return '#64748b';
        }
    }

    function initializeReportForm() {
        document.getElementById('report-form').reset();
        document.getElementById('photo-preview').innerHTML = '';
        uploadedPhotos = [];
        initializeLocationMap();
        document.getElementById('location-text').textContent = 'Enter address and click "Search Location"';
        manualCoordinates = null;
    }

    function initializeLocationMap() {
        const mapElement = document.getElementById('location-map-preview');
        if (!mapElement) return;
        mapElement.innerHTML = '';
        const locationMap = L.map('location-map-preview').setView([13.6333, 79.4167], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(locationMap);
        const addressInput = document.createElement('input');
        addressInput.type = 'text';
        addressInput.placeholder = 'Enter address...';
        addressInput.className = 'address-search-input';
        const searchButton = document.createElement('button');
        searchButton.textContent = 'Search';
        searchButton.type = 'button';
        searchButton.className = 'address-search-button';
        mapElement.appendChild(addressInput);
        mapElement.appendChild(searchButton);
        searchButton.addEventListener('click', (e) => { e.preventDefault(); searchAddress(addressInput.value, locationMap); });
        addressInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchAddress(addressInput.value, locationMap); } });
        locationMap.on('click', (e) => { setManualLocation(e.latlng.lat, e.latlng.lng, locationMap); });
        window.locationMap = locationMap;
    }

    async function searchAddress(address, map) {
        if (!address.trim()) { showNotification('Please enter an address', 'error'); return; }
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                map.setView([lat, lng], 15);
                setManualLocation(lat, lng, map);
                document.getElementById('location-text').textContent = `Location: ${data[0].display_name}`;
            } else {
                showNotification('Address not found. Please try a different address.', 'error');
            }
        } catch (error) {
            console.error('Address search error:', error);
            showNotification('Error searching address. Please try again.', 'error');
        }
    }

    function setManualLocation(lat, lng, map) {
        if (addressMarker) map.removeLayer(addressMarker);
        addressMarker = L.marker([lat, lng]).addTo(map).bindPopup('Selected Location').openPopup();
        manualCoordinates = { lat, lng };
        document.getElementById('location-text').textContent = `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }

    function handlePhotoUpload(e) {
        const files = e.target.files;
        const preview = document.getElementById('photo-preview');
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    uploadedPhotos.push(e.target.result);
                    preview.innerHTML += `<img src="${e.target.result}" alt="Uploaded photo">`;
                };
                reader.readAsDataURL(file);
            }
        }
    }

    async function handleReportSubmit(e) {
        e.preventDefault();
        const submitBtn = document.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;
        if (!validateReportForm()) return;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
        try {
            let imageUrls = [];

            // Store uploaded photos directly (base64 data URLs)
            // Note: Firebase Storage not used (requires Blaze plan)
            if (uploadedPhotos.length > 0) {
                imageUrls = uploadedPhotos.filter(p => p);
            }

            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving report...';

            const reportData = {
                title: document.getElementById('title-input').value.trim(),
                description: document.getElementById('description-input').value.trim(),
                category: document.getElementById('category-select').value,
                lat: manualCoordinates.lat,
                lng: manualCoordinates.lng,
                userId: currentUser.uid || null,
                username: currentUser.username,
                votes: 0,
                status: "pending",
                comments: [],
                createdAt: new Date().toISOString(),
                imageUrls: imageUrls,
                photo: imageUrls[0] || 'https://via.placeholder.com/150',
                voters: [],
                address: document.getElementById('location-text').textContent.replace('Location: ', '')
            };

            // Try to save to Firestore first
            let savedToFirestore = false;
            if (db && currentUser && currentUser.uid) {
                try {
                    const docRef = await db.collection('issues').add({
                        ...reportData,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    reportData.id = docRef.id;
                    savedToFirestore = true;
                    console.log('Report saved to Firestore with ID:', docRef.id);
                } catch (firestoreError) {
                    console.error('Firestore save error:', firestoreError);
                    // Fall back to localStorage
                }
            }

            // Also save to localStorage for offline/fallback
            reportData.id = reportData.id || generateId();
            allReports.unshift(reportData);
            saveReportsToLocalStorage();

            showNotification(savedToFirestore ? 'Report submitted and saved to cloud!' : 'Report submitted successfully!', 'success');
            document.getElementById('report-form').reset();
            document.getElementById('photo-preview').innerHTML = '';
            uploadedPhotos = [];
            manualCoordinates = null;
            showView('dashboard-view');
            updateDashboardStats();
            displayRecentIssues();
        } catch (error) {
            console.error('Report submission error:', error);
            showNotification('Error submitting report. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    function validateReportForm() {
        const title = document.getElementById('title-input').value.trim();
        const description = document.getElementById('description-input').value.trim();
        const category = document.getElementById('category-select').value;
        if (!title) { showNotification('Please enter a title for the issue.', 'error'); return false; }
        if (!description) { showNotification('Please describe the issue.', 'error'); return false; }
        if (!category) { showNotification('Please select a category.', 'error'); return false; }
        if (!manualCoordinates || !manualCoordinates.lat || !manualCoordinates.lng) { showNotification('Please select a location on the map.', 'error'); return false; }
        return true;
    }

    async function displayProfile() {
        if (!currentUser) return;

        // Use cached profile or fetch from Firestore
        let profileData = { ...currentUser };

        if (db && currentUser.uid) {
            try {
                const userDoc = await db.collection('users').doc(currentUser.uid).get();
                if (userDoc.exists) {
                    profileData = { ...profileData, ...userDoc.data() };
                    // Update global currentUser with latest data
                    currentUser = { ...currentUser, ...userDoc.data() };
                }

                // Get auth metadata if available (for member since)
                const user = firebase.auth().currentUser;
                if (user) {
                    profileData.email = user.email;
                    profileData.creationTime = user.metadata.creationTime;
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        }

        // Calculate stats from allReports (which includes Firestore data)
        const userReports = allReports.filter(r => r.username === currentUser.username);
        const resolvedCount = userReports.filter(r => r.status === 'resolved').length;
        const totalVotesReceived = userReports.reduce((sum, Report) => sum + (Report.votes || 0), 0);

        // Update UI
        document.getElementById('profile-username').textContent = profileData.username || 'User';
        document.querySelector('#profile-email span').textContent = profileData.email || 'No email linked';
        document.querySelector('#profile-role span').textContent = (profileData.role || 'user').charAt(0).toUpperCase() + (profileData.role || 'user').slice(1);

        const memberSince = profileData.creationTime ? new Date(profileData.creationTime).toLocaleDateString() : 'Unknown';
        document.querySelector('#profile-member-since span').textContent = memberSince;

        document.getElementById('profile-karma').textContent = profileData.karma || 0;
        document.getElementById('profile-reports').textContent = userReports.length;
        document.getElementById('profile-resolved').textContent = resolvedCount;
        document.getElementById('profile-votes-received').textContent = totalVotesReceived;

        displayUserReports();
    }

    async function displayUserReports() {
        const userReports = allReports.filter(r => r.username === currentUser.username);
        const container = document.getElementById('user-reports-container');
        if (userReports.length === 0) {
            container.innerHTML = '<p class="no-issues">You haven\'t submitted any reports yet.</p>';
            return;
        }
        container.innerHTML = userReports.map(issue => `
            <div class="issue-card">
                <div class="issue-header">
                    <h3 class="issue-title">${issue.title}</h3>
                    <span class="status-badge status-${issue.status}">${issue.status}</span>
                </div>
                <div class="issue-meta">
                    <span><i class="fas fa-calendar"></i> ${new Date(issue.createdAt).toLocaleDateString()}</span>
                    <span><i class="fas fa-thumbs-up"></i> ${issue.votes} votes</span>
                    <span><i class="fas fa-comments"></i> ${issue.comments ? issue.comments.length : 0} comments</span>
                </div>
                <p class="issue-description">${issue.description}</p>
                ${issue.assignedToNgo ? `<div class="issue-meta"><i class="fas fa-hands-helping"></i>Assigned to: ${issue.assignedToNgo}</div>` : ''}
            </div>
        `).join('');
    }

    function displayNGODashboard() {
        const ngoReports = allReports.filter(r => r.assignedToNgo === currentUser.username);
        document.getElementById('assigned-count').textContent = ngoReports.length;
        document.getElementById('ngo-progress-count').textContent = ngoReports.filter(r => r.status === 'inprogress').length;
        document.getElementById('ngo-resolved-count').textContent = ngoReports.filter(r => r.status === 'resolved').length;
        const container = document.getElementById('ngo-issues-container');
        if (ngoReports.length === 0) {
            container.innerHTML = '<p class="no-issues">No issues assigned to your NGO yet.</p>';
            return;
        }
        container.innerHTML = ngoReports.map(issue => `
            <div class="issue-card">
                <div class="issue-header">
                    <h3 class="issue-title">${issue.title}</h3>
                    <span class="status-badge status-${issue.status}">${issue.status}</span>
                </div>
                <div class="issue-meta">
                    <span><i class="fas fa-user"></i> ${issue.username}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(issue.createdAt).toLocaleDateString()}</span>
                    <span><i class="fas fa-thumbs-up"></i> ${issue.votes} votes</span>
                </div>
                <p class="issue-description">${issue.description}</p>
                ${issue.photo && issue.photo !== 'https://via.placeholder.com/150' ? `<img src="${issue.photo}" alt="Issue photo" class="issue-image">` : ''}
                <div class="issue-actions">
                    <div class="admin-actions">
                        ${issue.status !== 'resolved' ? `
                        <button type="button" class="btn-warning" onclick="updateIssueStatus(${issue.id}, 'inprogress')">Mark In Progress</button>
                        <button type="button" class="btn-info" onclick="updateIssueStatus(${issue.id}, 'resolved')">Mark Resolved</button>` : `
                        <button type="button" class="btn-warning" onclick="updateIssueStatus(${issue.id}, 'inprogress')">Reopen Issue</button>`}
                    </div>
                </div>
            </div>
        `).join('');
    }

    function displayAdminDashboard() {
        displayAdminIssues();
        displayNGOsList();
    }

    function switchAdminTab(tab) {
        document.querySelectorAll('.admin-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.admin-section').forEach(section => section.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-section`).classList.add('active');
    }

    function displayAdminIssues() {
        const container = document.getElementById('admin-issues-container');
        const issues = [...allReports].sort((a, b) => b.id - a.id);
        if (issues.length === 0) {
            container.innerHTML = '<p class="no-issues">No issues to moderate.</p>';
            return;
        }
        const ngos = ngosData;
        container.innerHTML = issues.map(issue => `
            <div class="issue-card">
                <div class="issue-header">
                    <h3 class="issue-title">${issue.title}</h3>
                    <span class="status-badge status-${issue.status}">${issue.status}</span>
                </div>
                <div class="issue-meta">
                    <span>By: ${issue.username}</span>
                    <span>Votes: ${issue.votes}</span>
                    <span>Date: ${new Date(issue.createdAt).toLocaleDateString()}</span>
                </div>
                <p class="issue-description">${issue.description}</p>
                ${issue.photo && issue.photo !== 'https://via.placeholder.com/150' ? `<img src="${issue.photo}" alt="Issue photo" class="issue-image">` : ''}
                <div class="admin-actions">
                    <select class="ngo-assign-select" onchange="assignToNGO(${issue.id}, this.value)">
                        <option value="">Assign to NGO...</option>
                        ${ngos.map(ngo => `<option value="${ngo.username}" ${issue.assignedToNgo === ngo.username ? 'selected' : ''}>${ngo.name}</option>`).join('')}
                    </select>
                    <button type="button" class="btn-danger" onclick="deleteReport(${issue.id})"><i class="fas fa-trash"></i> Delete</button>
                    <button type="button" class="btn-warning" onclick="updateIssueStatus(${issue.id}, '${issue.status === 'resolved' ? 'pending' : 'resolved'}')">${issue.status === 'resolved' ? 'Reopen' : 'Resolve'}</button>
                    <button type="button" class="btn-info" onclick="shareOnTwitter(${issue.id})"><i class="fab fa-twitter"></i> Share</button>
                </div>
            </div>
        `).join('');
    }

    function displayNGOsList() {
        const container = document.getElementById('ngos-list-container');
        const ngos = ngosData;
        if (ngos.length === 0) {
            container.innerHTML = '<p class="no-issues">No NGOs registered.</p>';
            return;
        }
        container.innerHTML = ngos.map(ngo => `
            <div class="issue-card">
                <h3>${ngo.name}</h3>
                <p><strong>Contact:</strong> ${ngo.contact}</p>
                <p><strong>Description:</strong> ${ngo.description}</p>
                <p><strong>Contact Person:</strong> ${ngo.contactPerson}</p>
            </div>
        `).join('');
    }

    window.assignToNGO = function (issueId, ngoUsername) {
        const issue = allReports.find(r => r.id === issueId);
        if (issue) {
            issue.assignedToNgo = ngoUsername;
            issue.status = 'inprogress';
            saveReportsToLocalStorage();
            showNotification(`Issue assigned to ${ngoUsername}`, 'success');
            displayAdminIssues();
        }
    };

    window.deleteReport = function (issueId) {
        if (!confirm('Are you sure you want to delete this report?')) return;
        allReports = allReports.filter(r => r.id !== issueId);
        saveReportsToLocalStorage();
        showNotification('Report deleted successfully', 'success');
        displayAdminIssues();
    };

    window.updateIssueStatus = function (issueId, status) {
        const issue = allReports.find(r => r.id === issueId);
        if (issue) {
            issue.status = status;
            saveReportsToLocalStorage();
            showNotification(`Issue status updated to ${status}`, 'success');
            if (currentUser.role === 'admin') {
                displayAdminIssues();
            } else if (currentUser.role === 'ngo') {
                displayNGODashboard();
            }
        }
    };

    window.shareOnTwitter = function (issueId) {
        const issue = allReports.find(r => r.id === issueId);
        if (issue) {
            const text = `Check out this community issue on CivicEye: "${issue.title}" - Status: ${issue.status}`;
            const url = window.location.href;
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            window.open(twitterUrl, '_blank');
        }
    };

    function showLoader() { if (loader) loader.classList.remove('hidden'); }
    function hideLoader() { if (loader) loader.classList.add('hidden'); }
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                userLocation.lat = position.coords.latitude;
                userLocation.lng = position.coords.longitude;
                const locationText = document.getElementById('location-text');
                if (locationText) locationText.textContent = `Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`;
            }, error => {
                console.error('Geolocation error:', error);
                const locationText = document.getElementById('location-text');
                if (locationText) locationText.textContent = 'Location access denied. Please enable location services.';
            });
        }
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i> ${message}`;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function refreshCurrentView() {
        const activeView = document.querySelector('.view-container.active');
        if (activeView) {
            const viewId = activeView.id;
            showView(viewId);
        }
    }

    // Comments Modal Functions
    window.showComments = function (issueId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        // Handle both string and numeric IDs
        const issue = allReports.find(r => String(r.id) === String(issueId));
        if (!issue) {
            console.error('Issue not found for ID:', issueId);
            showNotification('Issue not found.', 'error');
            return;
        }

        // Create or show comments modal
        let modal = document.getElementById('comments-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'comments-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const comments = issue.comments || [];
        const commentsHtml = comments.length > 0
            ? comments.map(c => `
                <div class="comment-item">
                    <div class="comment-header">
                        <strong>${c.username}</strong>
                        <span>${new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p>${c.text}</p>
                </div>
            `).join('')
            : '<p class="no-comments">No comments yet. Be the first to comment!</p>';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Comments on "${issue.title}"</h2>
                    <button class="close-modal" onclick="closeCommentsModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="comments-list" style="max-height: 300px; overflow-y: auto; margin: 1rem 0;">
                    ${commentsHtml}
                </div>
                ${currentUser ? `
                <div class="add-comment-section" style="margin-top: 1rem;">
                    <textarea id="new-comment-text" placeholder="Write a comment..." rows="3" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); resize: vertical;"></textarea>
                    <button class="primary-btn" onclick="addComment('${issue.id}')" style="margin-top: 0.5rem;">
                        <i class="fas fa-paper-plane"></i> Post Comment
                    </button>
                </div>
                ` : '<p style="color: var(--text-secondary);">Please log in to comment.</p>'}
            </div>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeCommentsModal = function () {
        const modal = document.getElementById('comments-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    };

    window.addComment = async function (issueId) {
        const textArea = document.getElementById('new-comment-text');
        const commentText = textArea ? textArea.value.trim() : '';

        if (!commentText) {
            showNotification('Please enter a comment.', 'error');
            return;
        }

        if (!currentUser) {
            showNotification('Please log in to comment.', 'error');
            return;
        }

        // Handle both string and numeric IDs
        const issue = allReports.find(r => String(r.id) === String(issueId));
        if (!issue) {
            console.error('Issue not found for ID:', issueId);
            showNotification('Issue not found.', 'error');
            return;
        }

        const newComment = {
            id: Date.now(),
            text: commentText,
            username: currentUser.username,
            userId: currentUser.uid || null,
            createdAt: new Date().toISOString()
        };

        // Add to local data
        issue.comments = issue.comments || [];
        issue.comments.push(newComment);

        // Sync with Firestore (check if document exists first)
        if (db && issue.id) {
            try {
                const docRef = db.collection('issues').doc(String(issue.id));
                const docSnap = await docRef.get();

                if (docSnap.exists) {
                    await docRef.update({
                        comments: firebase.firestore.FieldValue.arrayUnion(newComment)
                    });
                    console.log('Comment synced to Firestore for issue:', issue.id);
                }
            } catch (firestoreError) {
                console.error('Firestore comment update error:', firestoreError);
            }
        }

        saveReportsToLocalStorage();
        showNotification('Comment added!', 'success');

        // Refresh the modal
        closeCommentsModal();
        showComments(issueId);
        refreshCurrentView();
    };

    window.showAdminOptions = function () { showNotification('Admin options feature coming soon!', 'info'); }

    initApp();
});