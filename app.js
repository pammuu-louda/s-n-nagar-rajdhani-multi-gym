const STORAGE_KEY = 'GymTrainerPro';

class GymApp {
    constructor() {
        this.state = this.loadState();
        this.currentUser = null;
        this.init();
    }

    loadState() {
        const defaultState = {
            users: {}, // id: { role, name, dob }
            attendance: [], // { userId, name, date, present }
            machines: [
                { id: 1, name: 'Leg Press', group: 'leg' },
                { id: 2, name: 'Squat Rack', group: 'leg' },
                { id: 3, name: 'Chest Press', group: 'chest' },
                { id: 4, name: 'Cable Crossover', group: 'chest' },
                { id: 5, name: 'Lat Pulldown', group: 'back' }
            ]
        };
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : defaultState;
    }

    saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }

    init() {
        // Mock current day for attendance
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        this.currentDayString = days[new Date().getDay()];
        document.getElementById('current-day').innerText = this.currentDayString;

        // Check login state (simplified: if returning user exists in memory)
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            if (this.currentUser.role === 'owner') {
                this.navigate('owner-dashboard');
                this.renderOwnerDashboard();
            } else {
                if (!this.currentUser.name) {
                    this.navigate('onboarding');
                } else {
                    this.navigate('member-dashboard');
                    this.renderMemberDashboard();
                }
            }
        } else {
            this.navigate('splash');
        }
    }

    navigate(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        const view = document.getElementById(`view-${viewId}`);
        if (view) view.classList.add('active');
    }

    login(role) {
        // Simplified auth: create a session ID based on role
        const id = role + '_' + Math.random().toString(36).substr(2, 9);
        this.currentUser = { id, role, name: '', dob: '' };

        if (role === 'owner') {
            sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            this.navigate('owner-dashboard');
            this.renderOwnerDashboard();
            this.showToast('Logged in as Owner');
        } else {
            // New member needs onboarding
            this.navigate('onboarding');
        }
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
        this.navigate('login');
        this.showToast('Logged out successfully');
    }

    saveProfile() {
        const name = document.getElementById('member-name').value;
        const dob = document.getElementById('member-dob').value;

        if (!name || !dob) {
            this.showToast('Please fill out all fields');
            return;
        }

        this.currentUser.name = name;
        this.currentUser.dob = dob;

        // Save to "DB"
        this.state.users[this.currentUser.id] = this.currentUser;
        this.saveState();
        sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));

        this.navigate('member-dashboard');
        this.renderMemberDashboard();
        this.showToast('Profile saved!');
    }

    // --- Member Capabilities ---

    renderMemberDashboard() {
        document.getElementById('member-display-name').innerText = this.currentUser.name;
        this.checkAttendance();

        // populate all generic workouts if search is empty
        this.renderSearchResults('');
    }

    checkAttendance() {
        const todayStr = new Date().toDateString();
        const alreadyLogged = this.state.attendance.find(a => a.userId === this.currentUser.id && a.date === todayStr);

        const prompt = document.getElementById('attendance-prompt');
        if (!alreadyLogged) {
            prompt.classList.remove('hidden');
        } else {
            prompt.classList.add('hidden');
        }
    }

    markAttendance(isPresent) {
        if (!this.currentUser) return;

        const todayStr = new Date().toDateString();
        this.state.attendance.push({
            userId: this.currentUser.id,
            name: this.currentUser.name,
            date: todayStr,
            day: this.currentDayString,
            present: isPresent
        });
        this.saveState();

        document.getElementById('attendance-prompt').classList.add('hidden');
        this.showToast(isPresent ? 'Attendance recorded! Owner notified.' : 'Marked absent.');
    }

    searchWorkouts() {
        const query = document.getElementById('workout-search').value.toLowerCase();
        this.renderSearchResults(query);
    }

    renderSearchResults(query) {
        const container = document.getElementById('search-results');
        container.innerHTML = '';

        if (!query) {
            container.innerHTML = '<div class="placeholder-text">Search for a workout (e.g. "leg") to see available machines.</div>';
            return;
        }

        // Filter machines by query
        const availableMachines = this.state.machines.filter(m =>
            m.name.toLowerCase().includes(query) || m.group.toLowerCase().includes(query)
        );

        if (availableMachines.length === 0) {
            container.innerHTML = '<div class="placeholder-text">No machines available for this workout currently. Ask Owner to add them!</div>';
            return;
        }

        availableMachines.forEach(machine => {
            const el = document.createElement('div');
            el.className = 'list-item';

            const aiTip = this.generateAITip(this.currentUser.dob, machine.name);

            // random queue estimate
            const queue = Math.floor(Math.random() * 4);
            const queueText = queue === 0 ? 'Empty (0 waiting)' : `Crowded (${queue} waiting)`;
            const badgeColor = queue === 0 ? 'var(--accent)' : 'var(--secondary)';

            el.innerHTML = `
                <div class="title">${machine.name} <span style="font-size:0.8em;color:var(--text-secondary)">(${machine.group})</span></div>
                <div class="badge" style="color: ${badgeColor}; border: 1px solid ${badgeColor}; background: transparent;">📋 ${queueText}</div>
                <div class="ai-tip"><strong>AI Tip:</strong> ${aiTip}</div>
            `;
            container.appendChild(el);
        });
    }

    generateAITip(dob, machineName) {
        if (!dob) return "Keep a steady pace and stay hydrated!";
        const birthYear = new Date(dob).getFullYear();
        const age = new Date().getFullYear() - birthYear;

        if (age > 50) {
            return `For ${machineName}, focus on controlled movements to protect your joints. Keep intensity moderate. Name personalization active.`;
        } else if (age < 25) {
            return `Push your limits on the ${machineName}! You can handle higher volume and explosive power.`;
        } else {
            return `Maintain solid form on the ${machineName}. Try supersets to increase intensity for maximum gains.`;
        }
    }

    // --- Owner Capabilities ---

    switchOwnerTab(tabId) {
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.remove('active');
            if (t.getAttribute('onclick').includes(tabId)) t.classList.add('active');
        });
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        document.getElementById(`tab-${tabId}`).classList.add('active');

        if (tabId === 'attendance') this.renderAttendanceReport();
        if (tabId === 'machines') this.renderMachineList();
    }

    renderOwnerDashboard() {
        this.renderAttendanceReport();
        this.renderMachineList();
    }

    renderAttendanceReport() {
        const list = document.getElementById('attendance-list');
        list.innerHTML = '';

        const recent = [...this.state.attendance].reverse(); // newest first
        if (recent.length === 0) {
            list.innerHTML = '<div class="placeholder-text">No attendance records yet.</div>';
            return;
        }

        recent.forEach(record => {
            const el = document.createElement('div');
            el.className = 'list-item';
            const statusColor = record.present ? 'var(--accent)' : 'var(--secondary)';
            el.innerHTML = `
                <div class="title">${record.name}</div>
                <div class="subtitle">On ${record.date} (${record.day})</div>
                <div class="badge" style="color: ${statusColor}; border: 1px solid ${statusColor}; background: transparent;">
                    ${record.present ? 'Present' : 'Absent'}
                </div>
            `;
            list.appendChild(el);
        });
    }

    renderMachineList() {
        const list = document.getElementById('machine-list');
        list.innerHTML = '';

        this.state.machines.forEach(machine => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.innerHTML = `
                <div class="title">${machine.name}</div>
                <div class="subtitle">Target: ${machine.group}</div>
            `;
            list.appendChild(el);
        });
    }

    openAddMachineModal() {
        document.getElementById('modal-add-machine').classList.remove('hidden');
    }

    closeAddMachineModal() {
        document.getElementById('modal-add-machine').classList.add('hidden');
        document.getElementById('new-machine-name').value = '';
        document.getElementById('new-machine-group').value = '';
    }

    addMachine() {
        const name = document.getElementById('new-machine-name').value;
        const group = document.getElementById('new-machine-group').value;

        if (!name || !group) {
            this.showToast('Fill in all fields');
            return;
        }

        const newMachine = {
            id: Date.now(),
            name,
            group: group.toLowerCase()
        };

        this.state.machines.push(newMachine);
        this.saveState();
        this.renderMachineList();
        this.closeAddMachineModal();
        this.showToast('Machine added successfully!');
    }

    // UI Helpers
    showToast(msg) {
        const toast = document.getElementById('toast');
        toast.innerText = msg;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Init App
const app = new GymApp();
