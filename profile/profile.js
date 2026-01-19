(function() {
    'use strict';

    const TABS = {
        MY_DATA: 'my-data',
        PASSWORD: 'password',
        SECURITY: 'security'
    };

    let currentTab = TABS.MY_DATA;
    let profileData = null;
    let addressData = null;

    function getApiUrls(subdomain) {
        return {
            PROFILE_DATA: `https://${subdomain}.e-kreta.hu/Adminisztracio/Profil/SajatAdatlapPopUp`,
            ADDRESS_DATA: `https://${subdomain}.e-kreta.hu/api/ProfilApi/GetElerhetosegCimGrid?sort=&page=1&pageSize=100&group=&filter=&data=%7B%7D&_=`
        };
    }

    function hideOriginalElements() {
        const elementsToHide = [
            '#KretaProgressBar',
            '.main-header',
            '.main-menu',
            '.main-sidebar',
            '.content-header',
            '.favoriteIconContainer',
            '#frissitesDatumDiv',
            '#layout_navigationBar',
            '.navbar',
            '.sidebar-container',
            '#sidepanel_tabs',
            '.sidepanel-wrapper',
            '.main-footer2',
            '.lakatimg',
            '.modalContainer',
            '.modalOuter',
            '#ProfilTab'
        ];

        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
            });
        });

        document.body.innerHTML = '';
    }

    async function createNavbar() {
        const header = await createTemplate.header();
        const headerContainer = document.createElement('div');
        headerContainer.innerHTML = header;
        document.body.appendChild(headerContainer);

        setupUserDropdown();
        setupSettingsButton();
    }

    function setupUserDropdown() {
        const userBtn = document.querySelector('.user-dropdown-btn');
        const userDropdown = document.querySelector('.user-dropdown');

        userBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown?.classList.toggle('show');
            userBtn?.classList.toggle('open');
        });

        const mobileUserBtn = document.querySelector('#mobileUserBtn');
        const mobileUserDropdown = document.querySelector('#mobileUserDropdown');

        mobileUserBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileUserDropdown?.classList.toggle('show');
            mobileUserBtn?.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!userBtn?.contains(e.target) && !userDropdown?.contains(e.target)) {
                userDropdown?.classList.remove('show');
                userBtn?.classList.remove('open');
            }

            if (!mobileUserBtn?.contains(e.target) && !mobileUserDropdown?.contains(e.target)) {
                mobileUserDropdown?.classList.remove('show');
                mobileUserBtn?.classList.remove('active');
            }
        });

        const mobileDropdownItems = document.querySelectorAll('.mobile-dropdown-item');
        mobileDropdownItems.forEach(item => {
            item.addEventListener('click', () => {
                mobileUserDropdown?.classList.remove('show');
                mobileUserBtn?.classList.remove('active');
            });
        });
    }

    function setupSettingsButton() {
        document.getElementById('settingsBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = chrome.runtime.getURL('settings/index.html');
            window.open(url, '_blank', 'width=400,height=600');
        });

        document.getElementById('mobileSettingsBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = chrome.runtime.getURL('settings/index.html');
            window.open(url, '_blank', 'width=400,height=600');
        });
    }

    function createProfilePage() {
        const t = window.LanguageManager?.t || ((key) => key);

        const container = document.createElement('div');
        container.className = 'profile-container';
        container.innerHTML = `
            <div class="profile-wrapper">
                <div class="profile-sidebar">
                    <div class="profile-tabs">
                        <button class="profile-tab active" data-tab="${TABS.MY_DATA}">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <span>${t('profile.tab_my_data')}</span>
                        </button>
                        <button class="profile-tab" data-tab="${TABS.PASSWORD}">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                            </svg>
                            <span>${t('profile.tab_password')}</span>
                        </button>
                        <button class="profile-tab" data-tab="${TABS.SECURITY}">
                            <svg viewBox="0 0 24 24" width="20" height="20">
                                <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                            </svg>
                            <span>${t('profile.tab_security')}</span>
                        </button>
                    </div>
                </div>

                <div class="profile-content">
                    <div id="tab-${TABS.MY_DATA}" class="tab-content active">
                        <div class="loading-spinner">
                            <div class="spinner"></div>
                            <p>${t('profile.loading_data')}</p>
                        </div>
                    </div>

                    <div id="tab-${TABS.PASSWORD}" class="tab-content">
                        <div class="tab-header">
                            <h2>${t('profile.tab_password')}</h2>
                        </div>
                        <div class="info-message">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                            </svg>
                            <p>${t('profile.password_change_unavailable')}</p>
                        </div>
                    </div>

                    <div id="tab-${TABS.SECURITY}" class="tab-content">
                        <div class="tab-header">
                            <h2>${t('profile.tab_security')}</h2>
                        </div>
                        <div class="info-message">
                            <p>${t('profile.security_settings_info')}</p>
                            <button id="security-redirect-btn" class="security-btn">
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                                </svg>
                                ${t('profile.open_security_settings')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
    }

    async function fetchProfileData() {
        try {
            const subdomain = await storageManager.get('schoolSubdomain', '');
            if (!subdomain) {
                console.error('Nincs beállítva az iskola alcím');
                return null;
            }

            const apiUrls = getApiUrls(subdomain);
            const response = await fetch(apiUrls.PROFILE_DATA);
            const html = await response.text();
            return parseProfileHTML(html);
        } catch (error) {
            console.error('Hiba a profil adatok lekérésekor:', error);
            return null;
        }
    }

    async function fetchAddressData() {
        try {
            const subdomain = await storageManager.get('schoolSubdomain', '');
            if (!subdomain) {
                console.error('Nincs beállítva az iskola alcím');
                return null;
            }

            const apiUrls = getApiUrls(subdomain);
            const timestamp = new Date().getTime();
            const response = await fetch(apiUrls.ADDRESS_DATA + timestamp);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Hiba a cím adatok lekérésekor:', error);
            return null;
        }
    }

    function parseProfileHTML(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const data = {
            personal: {},
            contact: {},
            bankAccount: {},
            studentCard: {}
        };

        const personalFields = [
            { id: 'AlapAdat_CsaladiNev', key: 'familyName' },
            { id: 'AlapAdat_Utonev', key: 'firstName' },
            { id: 'AlapAdat_SzuletesiCsaladNev', key: 'birthFamilyName' },
            { id: 'AlapAdat_SzuletesiUtonev', key: 'birthFirstName' },
            { id: 'AlapAdat_AnyjaCsaladiNeve', key: 'motherFamilyName' },
            { id: 'AlapAdat_AnyjaUtonev', key: 'motherFirstName' },
            { id: 'AlapAdat_SzuletesiIdo_SDATE', key: 'birthDate' },
            { id: 'AlapAdat_SzuletesiHely', key: 'birthPlace' },
            { id: 'AlapAdat_SzuletesiOrszag', key: 'birthCountry' },
            { id: 'AlapAdat_Anyanyelv', key: 'motherTongue' },
            { id: 'AlapAdat_Allampolgarsag', key: 'citizenship' },
            { id: 'AlapAdat_OsztalyfonokNev', key: 'classTeacher' },
            { id: 'AlapAdat_OsztalyNev', key: 'className' },
            { id: 'AlapAdat_TeremNev', key: 'classroom' },
            { id: 'AlapAdat_BelepesiNev', key: 'username' }
        ];

        personalFields.forEach(field => {
            const label = doc.querySelector(`label[displayfor="${field.id}"]`);
            if (label) {
                data.personal[field.key] = {
                    key: field.key,
                    value: label.textContent.trim()
                };
            }
        });

        const phoneInput = doc.querySelector('#Elerhetosegek_ErtesitesiTelefon_TelefonSzam');
        const emailInput = doc.querySelector('#Elerhetosegek_ErtesitesiEmail_EmailCim');

        if (phoneInput) {
            data.contact.phone = {
                key: 'phone',
                value: phoneInput.value || ''
            };
        }

        if (emailInput) {
            data.contact.email = {
                key: 'email',
                value: emailInput.value || ''
            };
        }

        const bankFields = [
            { id: 'BankszamlaSzam', key: 'accountNumber' },
            { id: 'SzamlavezetoBank', key: 'bankName' },
            { id: 'BankszamlaTulajdonosNeve', key: 'accountOwner' }
        ];

        bankFields.forEach(field => {
            const input = doc.querySelector(`#${field.id}`);
            if (input) {
                data.bankAccount[field.key] = {
                    key: field.key,
                    value: input.value || ''
                };
            }
        });

        const cardFields = [
            { id: 'TanuloIgazolvany_Igazolvanyszam', key: 'cardNumber' },
            { id: 'TanuloIgazolvany_AdoazonositoJel', key: 'taxId' },
            { id: 'TanuloIgazolvany_DiakigazolvanySzam', key: 'studentCardNumber' },
            { id: 'TanuloIgazolvany_TajSzam', key: 'socialSecurityNumber' }
        ];

        cardFields.forEach(field => {
            const label = doc.querySelector(`label[displayfor="${field.id}"]`);
            if (label) {
                data.studentCard[field.key] = {
                    key: field.key,
                    value: label.textContent.trim()
                };
            }
        });

        return data;
    }

    function renderProfileData() {
        const t = window.LanguageManager?.t || ((key) => key);
        const container = document.getElementById(`tab-${TABS.MY_DATA}`);

        if (!profileData && !addressData) {
            container.innerHTML = `
                <div class="error-message">
                    <svg viewBox="0 0 24 24" width="48" height="48">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <p>${t('profile.loading_error')}</p>
                </div>
            `;
            return;
        }

        let html = `<div class="tab-header"><h2>${t('profile.my_data_title')}</h2></div>`;

        if (profileData && profileData.personal && Object.keys(profileData.personal).length > 0) {
            html += `<div class="data-section"><h3>${t('profile.personal_data')}</h3><div class="data-grid">`;

            Object.values(profileData.personal).forEach(field => {
                if (field.value && field.value !== 'XY') {
                    html += `
                        <div class="data-item">
                            <label>${t(`profile.field_${field.key}`)}</label>
                            <span>${field.value}</span>
                        </div>
                    `;
                }
            });

            html += '</div></div>';
        }

        if (profileData && profileData.contact && Object.keys(profileData.contact).length > 0) {
            html += `<div class="data-section"><h3>${t('profile.contact_data')}</h3><div class="data-grid">`;

            Object.values(profileData.contact).forEach(field => {
                if (field.value) {
                    html += `
                        <div class="data-item">
                            <label>${t(`profile.field_${field.key}`)}</label>
                            <span>${field.value}</span>
                        </div>
                    `;
                }
            });

            html += '</div></div>';
        }

        if (addressData && addressData.Data && addressData.Data.length > 0) {
            html += `<div class="data-section"><h3>${t('profile.address_data')}</h3><div class="address-list">`;

            addressData.Data.forEach(address => {
                const fullAddress = `${address.Irsz} ${address.Varos}, ${address.Kozterulet} ${address.KozteruletJellegeNev || ''} ${address.HazSzam}${address.Emelet ? ' ' + address.Emelet : ''}${address.Ajto ? ' ' + address.Ajto : ''}`;
                const isDefault = address.Alapertelmezett_BOOL;

                html += `
                    <div class="address-item ${isDefault ? 'default' : ''}">
                        <div class="address-type">
                            <strong>${address.CimTipus_DNAME}</strong>
                            ${isDefault ? `<span class="badge">${t('profile.default_address')}</span>` : ''}
                        </div>
                        <div class="address-details">${fullAddress}</div>
                    </div>
                `;
            });

            html += '</div></div>';
        }

        if (profileData && profileData.bankAccount && Object.keys(profileData.bankAccount).length > 0) {
            const hasData = Object.values(profileData.bankAccount).some(field => field.value);

            if (hasData) {
                html += `<div class="data-section"><h3>${t('profile.bank_account_data')}</h3><div class="data-grid">`;

                Object.values(profileData.bankAccount).forEach(field => {
                    if (field.value) {
                        html += `
                            <div class="data-item">
                                <label>${t(`profile.field_${field.key}`)}</label>
                                <span>${field.value}</span>
                            </div>
                        `;
                    }
                });

                html += '</div></div>';
            }
        }

        if (profileData && profileData.studentCard && Object.keys(profileData.studentCard).length > 0) {
            const hasData = Object.values(profileData.studentCard).some(field => field.value && field.value !== 'XY');

            if (hasData) {
                html += `<div class="data-section"><h3>${t('profile.student_card_data')}</h3><div class="data-grid">`;

                Object.values(profileData.studentCard).forEach(field => {
                    if (field.value && field.value !== 'XY') {
                        html += `
                            <div class="data-item">
                                <label>${t(`profile.field_${field.key}`)}</label>
                                <span>${field.value}</span>
                            </div>
                        `;
                    }
                });

                html += '</div></div>';
            }
        }

        container.innerHTML = html;
    }

    function setupTabSwitching() {
        const tabs = document.querySelectorAll('.profile-tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');

                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                tabContents.forEach(tc => tc.classList.remove('active'));
                document.getElementById(`tab-${tabId}`).classList.add('active');

                currentTab = tabId;
            });
        });
    }

    async function setupSecurityRedirect() {
        const btn = document.getElementById('security-redirect-btn');
        if (btn) {
            btn.addEventListener('click', async () => {
                const subdomain = await storageManager.get('schoolSubdomain', '');
                const url = `https://idp.e-kreta.hu/security?returnUrl=https%3A%2F%2F${subdomain}.e-kreta.hu%2FAdminisztracio%2FProfil`;
                window.location.href = url;
            });
        }
    }

    async function init() {
        try {
            hideOriginalElements();

            if (typeof window.LanguageManager !== 'undefined' && window.LanguageManager.init) {
                await window.LanguageManager.init();
            }

            await createNavbar();
            createProfilePage();
            setupTabSwitching();
            setupSecurityRedirect();

            [profileData, addressData] = await Promise.all([
                fetchProfileData(),
                fetchAddressData()
            ]);

            renderProfileData();
        } catch (error) {
            console.error('Hiba az inicializálás során:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
