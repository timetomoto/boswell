(function () {
	'use strict';

	var cfg = (typeof window !== 'undefined' && window.__BOZZIES_CONSENT__) || {};
	var COOKIE = 'bozzies_cookie_consent';
	var DAYS = (typeof cfg.cookieDays === 'number' && cfg.cookieDays > 0) ? cfg.cookieDays : 180;
	var MID = cfg.measurementId || '';

	function getCookie(name) {
		var pattern = new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)');
		var match = document.cookie.match(pattern);
		return match ? decodeURIComponent(match[1]) : null;
	}

	function setCookie(name, value, days) {
		var d = new Date();
		d.setTime(d.getTime() + days * 86400000);
		var secure = window.location.protocol === 'https:' ? '; Secure' : '';
		document.cookie = name + '=' + encodeURIComponent(value) +
			'; expires=' + d.toUTCString() +
			'; path=/; SameSite=Lax' + secure;
	}

	var googleLoaded = false;
	function loadGoogleTag() {
		if (googleLoaded || !MID) return;
		googleLoaded = true;
		window.dataLayer = window.dataLayer || [];
		function gtag() { window.dataLayer.push(arguments); }
		window.gtag = gtag;
		gtag('js', new Date());
		gtag('config', MID);
		var script = document.createElement('script');
		script.async = true;
		script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MID);
		document.head.appendChild(script);
	}

	var banner = document.getElementById('bozzies-consent');
	var settingsButtons = document.querySelectorAll('.bozzies-cookie-settings');

	function showBanner() {
		if (banner) banner.hidden = false;
	}
	function hideBanner() {
		if (banner) banner.hidden = true;
	}

	if (banner) {
		var acceptBtn = document.getElementById('bozzies-consent-accept');
		var declineBtn = document.getElementById('bozzies-consent-decline');
		if (acceptBtn) {
			acceptBtn.addEventListener('click', function () {
				setCookie(COOKIE, 'accept', DAYS);
				loadGoogleTag();
				hideBanner();
			});
		}
		if (declineBtn) {
			declineBtn.addEventListener('click', function () {
				setCookie(COOKIE, 'decline', DAYS);
				hideBanner();
			});
		}
	}

	// The footer "Cookie settings" button renders unconditionally (visible
	// + focusable from first paint). This file used to flip el.hidden off
	// here; the a11y remediation branch removed the `hidden` attribute from
	// the button so we only need to attach the click handler.
	Array.prototype.forEach.call(settingsButtons, function (el) {
		el.addEventListener('click', function () {
			showBanner();
		});
	});

	var choice = getCookie(COOKIE);
	if (choice === 'accept') {
		loadGoogleTag();
	} else if (choice !== 'decline') {
		showBanner();
	}
})();
