(function () {
    'use strict';

    /* ==================================================================
       Nocturne — Waitlist Launch Page Interaction Logic
       Modules:
         1. Particle Flow Field (Canvas)
         2. Cursor Light Glow
         3. Magnetic Buttons
         4. Hero Word Reveal
         5. Intersection Observer Reveals
         6. Count-Up Stats
         7. Countdown Timer
         8. Feature Card 3D Tilt
         9. Nav Scroll State + Smooth Scroll
        10. Multi-Step Waitlist Form
        11. Success Confetti Burst
       ================================================================== */

    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.addEventListener('DOMContentLoaded', init);

    function init() {
        setupFooterYear();
        ParticleFlow.init();
        CursorGlow.init();
        MagneticButtons.init();
        HeroReveal.init();
        RevealObserver.init();
        CountUp.init();
        Countdown.init();
        FeatureTilt.init();
        NavScroll.init();
        WaitlistForm.init();
        ConfettiBurst.init();
    }

    /* ==================================================================
       0. Footer Year
       ================================================================== */
    function setupFooterYear() {
        var el = document.getElementById('footer-year');
        if (el) el.textContent = new Date().getFullYear();
    }

    /* ==================================================================
       1. Particle Flow Field
       ================================================================== */
    var ParticleFlow = (function () {
        var canvas, ctx, particles, w, h, dpr, rafId, mouse, time;

        function init() {
            canvas = document.getElementById('particle-canvas');
            if (!canvas || prefersReducedMotion) return;
            ctx = canvas.getContext('2d');
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            mouse = { x: -9999, y: -9999 };
            time = 0;
            particles = [];

            resize();
            window.addEventListener('resize', debounce(resize, 200));
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseleave', function () { mouse.x = -9999; mouse.y = -9999; });

            createParticles();
            animate();
        }

        function resize() {
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function onMouseMove(e) {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        }

        function createParticles() {
            particles = [];
            var count = Math.min(Math.floor((w * h) / 18000), 90);
            for (var i = 0; i < count; i++) {
                particles.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: 0,
                    vy: 0,
                    size: Math.random() * 1.6 + 0.4,
                    hue: Math.random() < 0.5 ? 190 : (Math.random() < 0.5 ? 260 : 320),
                    life: Math.random()
                });
            }
        }

        // Simplex-like noise approximation using sines
        function noise(x, y, t) {
            return (
                Math.sin(x * 0.002 + t * 0.3) * 0.5 +
                Math.cos(y * 0.0025 - t * 0.25) * 0.5 +
                Math.sin((x + y) * 0.0015 + t * 0.2) * 0.3
            );
        }

        function animate() {
            rafId = requestAnimationFrame(animate);
            time += 0.005;
            ctx.clearRect(0, 0, w, h);

            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                var n = noise(p.x, p.y, time);
                var angle = n * Math.PI * 2;
                var speed = 0.4;

                p.vx += Math.cos(angle) * speed * 0.05;
                p.vy += Math.sin(angle) * speed * 0.05;

                // Mouse repulsion
                var dx = p.x - mouse.x;
                var dy = p.y - mouse.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 140 && dist > 0) {
                    var force = (1 - dist / 140) * 1.8;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }

                p.vx *= 0.94;
                p.vy *= 0.94;
                p.x += p.vx;
                p.y += p.vy;
                p.life += 0.005;

                // Wrap around edges
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10;
                if (p.y > h + 10) p.y = -10;

                var alpha = 0.15 + Math.sin(p.life * 2) * 0.1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'hsla(' + p.hue + ', 85%, 70%, ' + alpha + ')';
                ctx.fill();
            }

            // Connect nearby particles
            ctx.lineWidth = 0.5;
            for (var a = 0; a < particles.length; a++) {
                for (var b = a + 1; b < particles.length; b++) {
                    var pa = particles[a];
                    var pb = particles[b];
                    var ddx = pa.x - pb.x;
                    var ddy = pa.y - pb.y;
                    var dd = ddx * ddx + ddy * ddy;
                    if (dd < 12000) {
                        var lineAlpha = (1 - dd / 12000) * 0.08;
                        ctx.beginPath();
                        ctx.moveTo(pa.x, pa.y);
                        ctx.lineTo(pb.x, pb.y);
                        ctx.strokeStyle = 'rgba(167, 139, 250, ' + lineAlpha + ')';
                        ctx.stroke();
                    }
                }
            }
        }

        return { init: init };
    })();

    /* ==================================================================
       2. Cursor Light Glow
       ================================================================== */
    var CursorGlow = (function () {
        function init() {
            var glow = document.getElementById('cursor-glow');
            if (!glow || prefersReducedMotion) return;

            var x = 0, y = 0, tx = 0, ty = 0;
            var rafId = null;
            var active = false;

            window.addEventListener('mousemove', function (e) {
                tx = e.clientX;
                ty = e.clientY;
                if (!active) {
                    document.body.classList.add('cursor-active');
                    active = true;
                }
                if (!rafId) loop();
            });

            window.addEventListener('mouseleave', function () {
                document.body.classList.remove('cursor-active');
                active = false;
            });

            function loop() {
                x += (tx - x) * 0.12;
                y += (ty - y) * 0.12;
                glow.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -50%)';
                if (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5) {
                    rafId = requestAnimationFrame(loop);
                } else {
                    rafId = null;
                }
            }
        }
        return { init: init };
    })();

    /* ==================================================================
       3. Magnetic Buttons
       ================================================================== */
    var MagneticButtons = (function () {
        function init() {
            if (prefersReducedMotion) return;
            var btns = document.querySelectorAll('[data-magnetic]');
            btns.forEach(function (btn) {
                var strength = 0.35;
                btn.addEventListener('mousemove', function (e) {
                    var rect = btn.getBoundingClientRect();
                    var mx = e.clientX - rect.left - rect.width / 2;
                    var my = e.clientY - rect.top - rect.height / 2;
                    btn.style.transform = 'translate(' + (mx * strength) + 'px, ' + (my * strength) + 'px)';
                });
                btn.addEventListener('mouseleave', function () {
                    btn.style.transform = '';
                });
            });
        }
        return { init: init };
    })();

    /* ==================================================================
       4. Hero Word Reveal (staggered)
       ================================================================== */
    var HeroReveal = (function () {
        function init() {
            var words = document.querySelectorAll('.hero-headline .word');
            words.forEach(function (word, i) {
                setTimeout(function () {
                    word.classList.add('in');
                }, 200 + i * 120);
            });
        }
        return { init: init };
    })();

    /* ==================================================================
       5. Intersection Observer Reveals
       ================================================================== */
    var RevealObserver = (function () {
        function init() {
            var els = document.querySelectorAll('[data-reveal]');
            if (!('IntersectionObserver' in window)) {
                els.forEach(function (el) { el.classList.add('active'); });
                return;
            }
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
            els.forEach(function (el) { io.observe(el); });
        }
        return { init: init };
    })();

    /* ==================================================================
       6. Count-Up Stats
       ================================================================== */
    var CountUp = (function () {
        function init() {
            var els = document.querySelectorAll('.count-up');
            if (!('IntersectionObserver' in window)) {
                els.forEach(function (el) {
                    el.textContent = el.getAttribute('data-target');
                });
                return;
            }
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        animateValue(entry.target);
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.5 });
            els.forEach(function (el) { io.observe(el); });
        }

        function animateValue(el) {
            var target = parseInt(el.getAttribute('data-target') || '0', 10);
            if (!target) return;
            var duration = 1600;
            var start = null;

            function step(ts) {
                if (!start) start = ts;
                var progress = Math.min((ts - start) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 4);
                var val = Math.floor(eased * target);
                el.textContent = formatNumber(val);
                if (progress < 1) requestAnimationFrame(step);
                else el.textContent = formatNumber(target);
            }
            requestAnimationFrame(step);
        }

        function formatNumber(n) {
            return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        return { init: init };
    })();

    /* ==================================================================
       7. Countdown Timer
       ================================================================== */
    var Countdown = (function () {
        function init() {
            var grid = document.getElementById('countdown-grid');
            if (!grid) return;

            // Target: 14 days from first load (persisted in sessionStorage for realism)
            var targetKey = 'nocturne_launch_target';
            var target = parseInt(sessionStorage.getItem(targetKey) || '0', 10);
            if (!target) {
                target = Date.now() + 14 * 24 * 3600 * 1000 + 6 * 3600 * 1000 + 32 * 60 * 1000 + 18 * 1000;
                sessionStorage.setItem(targetKey, String(target));
            }

            var dEl = grid.querySelector('[data-cd="days"]');
            var hEl = grid.querySelector('[data-cd="hours"]');
            var mEl = grid.querySelector('[data-cd="mins"]');
            var sEl = grid.querySelector('[data-cd="secs"]');

            var prev = { d: '', h: '', m: '', s: '' };

            function tick() {
                var remaining = Math.max(0, target - Date.now());
                var d = Math.floor(remaining / (24 * 3600 * 1000));
                var h = Math.floor((remaining % (24 * 3600 * 1000)) / (3600 * 1000));
                var m = Math.floor((remaining % (3600 * 1000)) / (60 * 1000));
                var s = Math.floor((remaining % (60 * 1000)) / 1000);

                var dStr = String(d).padStart(2, '0');
                var hStr = String(h).padStart(2, '0');
                var mStr = String(m).padStart(2, '0');
                var sStr = String(s).padStart(2, '0');

                flipUpdate(dEl, dStr, 'd');
                flipUpdate(hEl, hStr, 'h');
                flipUpdate(mEl, mStr, 'm');
                flipUpdate(sEl, sStr, 's');
            }

            function flipUpdate(el, val, key) {
                if (prev[key] === val) return;
                prev[key] = val;
                el.textContent = val;
                el.classList.remove('flip');
                void el.offsetWidth; // reflow to restart animation
                el.classList.add('flip');
            }

            tick();
            setInterval(tick, 1000);
        }
        return { init: init };
    })();

    /* ==================================================================
       8. Feature Card 3D Tilt
       ================================================================== */
    var FeatureTilt = (function () {
        function init() {
            if (prefersReducedMotion) return;
            var cards = document.querySelectorAll('[data-tilt]');
            cards.forEach(function (card) {
                var maxTilt = 8;
                card.addEventListener('mousemove', function (e) {
                    var rect = card.getBoundingClientRect();
                    var px = (e.clientX - rect.left) / rect.width;
                    var py = (e.clientY - rect.top) / rect.height;
                    var rx = (0.5 - py) * maxTilt;
                    var ry = (px - 0.5) * maxTilt;
                    card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
                });
                card.addEventListener('mouseleave', function () {
                    card.style.transform = '';
                });
            });
        }
        return { init: init };
    })();

    /* ==================================================================
       9. Nav Scroll State + Smooth Scroll
       ================================================================== */
    var NavScroll = (function () {
        function init() {
            var nav = document.getElementById('top-nav');
            var ctaScroll = document.getElementById('cta-scroll');

            window.addEventListener('scroll', function () {
                if (window.scrollY > 60) {
                    nav.classList.add('scrolled');
                } else {
                    nav.classList.remove('scrolled');
                }
            });

            if (ctaScroll) {
                ctaScroll.addEventListener('click', function () {
                    var join = document.getElementById('join');
                    if (join) join.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
            }

            // Nav links smooth scroll
            document.querySelectorAll('.nav-link[href^="#"]').forEach(function (link) {
                link.addEventListener('click', function (e) {
                    var href = link.getAttribute('href');
                    var target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
        }
        return { init: init };
    })();

    /* ==================================================================
       10. Multi-Step Waitlist Form
       ================================================================== */
    var WaitlistForm = (function () {
        var state = { email: '', role: '', ticket: 0 };

        function init() {
            var form = document.getElementById('email-form');
            var roleGrid = document.getElementById('role-grid');
            var roleBack = document.getElementById('role-back');

            if (form) {
                form.addEventListener('submit', onEmailSubmit);
            }

            if (roleGrid) {
                roleGrid.addEventListener('click', onRoleClick);
            }

            if (roleBack) {
                roleBack.addEventListener('click', function () {
                    goToStep(1);
                });
            }
        }

        function onEmailSubmit(e) {
            e.preventDefault();
            var input = document.getElementById('email-input');
            var errorEl = document.getElementById('email-error');
            var email = input.value.trim();

            var error = validateEmail(email);
            if (error) {
                errorEl.textContent = error;
                errorEl.classList.add('show');
                input.focus();
                shakeInput(input);
                return;
            }

            errorEl.classList.remove('show');
            state.email = email;

            // Increment hero count for delight
            bumpHeroCount();

            goToStep(2);
        }

        function onRoleClick(e) {
            var card = e.target.closest('.role-card');
            if (!card) return;

            // Visual select
            document.querySelectorAll('.role-card').forEach(function (c) {
                c.classList.remove('selected');
            });
            card.classList.add('selected');

            state.role = card.getAttribute('data-role') || 'explorer';

            // Brief delay for visual feedback then proceed
            setTimeout(function () {
                completeSignup();
            }, 480);
        }

        function completeSignup() {
            state.ticket = 2847 + Math.floor(Math.random() * 120) + 1;
            var name = document.getElementById('success-name');
            var emailEl = document.getElementById('success-email');
            var ticketEl = document.getElementById('ticket-num');

            var roleNames = {
                writer: '书写者',
                researcher: '探索者',
                designer: '造物者',
                builder: '构建者'
            };
            if (name) name.textContent = roleNames[state.role] || '思考者';
            if (emailEl) emailEl.textContent = state.email;
            if (ticketEl) animateTicket(ticketEl, state.ticket);

            goToStep(3);

            // Trigger confetti
            setTimeout(function () {
                ConfettiBurst.fire();
            }, 500);
        }

        function animateTicket(el, target) {
            var duration = 1200;
            var start = null;
            function step(ts) {
                if (!start) start = ts;
                var progress = Math.min((ts - start) / duration, 1);
                var eased = 1 - Math.pow(1 - progress, 4);
                var val = Math.floor(eased * target);
                el.textContent = String(val).padStart(4, '0');
                if (progress < 1) requestAnimationFrame(step);
                else el.textContent = String(target).padStart(4, '0');
            }
            requestAnimationFrame(step);
        }

        function goToStep(step) {
            // Update step indicators
            var steps = document.querySelectorAll('.join-step');
            steps.forEach(function (s) {
                var sNum = parseInt(s.getAttribute('data-step'), 10);
                s.classList.remove('active', 'done');
                if (sNum < step) s.classList.add('done');
                else if (sNum === step) s.classList.add('active');
            });

            // Update bridges
            var bridges = document.querySelectorAll('.step-bridge');
            bridges.forEach(function (b, i) {
                b.style.background = i < (step - 1) ? 'var(--accent-a)' : 'var(--glass-border-strong)';
                b.style.opacity = i < (step - 1) ? '0.6' : '';
            });

            // Switch screens
            var screens = document.querySelectorAll('.join-screen');
            screens.forEach(function (sc) {
                sc.classList.remove('active');
            });
            var target = document.querySelector('.join-screen[data-screen="' + screenName(step) + '"]');
            if (target) target.classList.add('active');
        }

        function screenName(step) {
            var map = { 1: 'email', 2: 'role', 3: 'success' };
            return map[step] || 'email';
        }

        function validateEmail(email) {
            if (!email) return '请输入你的邮箱地址';
            if (email.length < 5) return '邮箱地址似乎太短了';
            var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!re.test(email)) return '邮箱格式看起来不太对，再检查一下？';
            return '';
        }

        function shakeInput(input) {
            input.style.animation = 'none';
            void input.offsetWidth;
            input.style.animation = 'shake 0.4s ' + EASE;
        }

        function bumpHeroCount() {
            var el = document.getElementById('hero-count');
            if (!el) return;
            var current = parseInt(el.textContent.replace(/,/g, ''), 10) || 2847;
            var next = current + 1;
            el.textContent = next.toLocaleString();
        }

        return { init: init, state: state };
    })();

    /* ==================================================================
       11. Confetti Burst
       ================================================================== */
    var ConfettiBurst = (function () {
        var canvas, ctx, pieces, rafId, w, h;

        function init() {
            canvas = document.getElementById('confetti-canvas');
            if (!canvas) return;
            ctx = canvas.getContext('2d');
            pieces = [];
        }

        function fire() {
            if (!canvas || prefersReducedMotion) return;
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w;
            canvas.height = h;
            pieces = [];

            var colors = ['#6ee7ff', '#a78bfa', '#f472b6', '#ffffff', '#7af0c8'];
            var count = 120;

            // Find the success button position as origin
            var originX = w / 2;
            var originY = h / 2;
            var successBtn = document.querySelector('.success-share') || document.querySelector('.success-check');
            if (successBtn) {
                var rect = successBtn.getBoundingClientRect();
                originX = rect.left + rect.width / 2;
                originY = rect.top + rect.height / 2;
            }

            for (var i = 0; i < count; i++) {
                var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
                var speed = Math.random() * 8 + 4;
                pieces.push({
                    x: originX,
                    y: originY,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2,
                    size: Math.random() * 6 + 3,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    rot: Math.random() * Math.PI * 2,
                    vr: (Math.random() - 0.5) * 0.3,
                    shape: Math.random() < 0.5 ? 'rect' : 'circle',
                    life: 1
                });
            }

            if (rafId) cancelAnimationFrame(rafId);
            animate();
        }

        function animate() {
            rafId = requestAnimationFrame(animate);
            ctx.clearRect(0, 0, w, h);

            var alive = false;
            for (var i = 0; i < pieces.length; i++) {
                var p = pieces[i];
                if (p.life <= 0) continue;
                alive = true;

                p.vy += 0.18; // gravity
                p.vx *= 0.99;
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.vr;
                p.life -= 0.008;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.globalAlpha = Math.max(0, p.life);
                ctx.fillStyle = p.color;

                if (p.shape === 'rect') {
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            if (!alive) {
                cancelAnimationFrame(rafId);
                rafId = null;
                ctx.clearRect(0, 0, w, h);
            }
        }

        return { init: init, fire: fire };
    })();

    /* ==================================================================
       Share Handler (exposed globally for inline onclick)
       ================================================================== */
    window.__nocturneShare = function () {
        var text = '我加入了 Nocturne 候补名单，一个为深度思考者打造的创作空间。你要一起来吗？';
        var url = window.location.href;
        if (navigator.share) {
            navigator.share({ title: 'Nocturne', text: text, url: url }).catch(function () {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(text + ' ' + url).then(function () {
                showToast('链接已复制，去分享给同道中人吧');
            }).catch(function () {
                showToast('分享：' + url);
            });
        } else {
            showToast('分享：' + url);
        }
    };

    function showToast(msg) {
        var existing = document.querySelector('.nocturne-toast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.className = 'nocturne-toast';
        toast.textContent = msg;
        toast.style.cssText =
            'position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);' +
            'padding:12px 24px;border-radius:100px;background:rgba(7,7,14,0.85);' +
            'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);' +
            'border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.94);' +
            'font-size:13px;font-family:Inter,sans-serif;z-index:10000;opacity:0;' +
            'transition:all 0.5s cubic-bezier(0.16,1,0.3,1);pointer-events:none;';
        document.body.appendChild(toast);
        requestAnimationFrame(function () {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(function () { toast.remove(); }, 500);
        }, 2800);
    }

    /* ==================================================================
       Utilities
       ================================================================== */
    function debounce(fn, wait) {
        var t;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(ctx, args); }, wait);
        };
    }

    // Inject shake keyframe dynamically (keeps CSS lean)
    var shakeStyle = document.createElement('style');
    shakeStyle.textContent =
        '@keyframes shake { ' +
        '0%, 100% { transform: translateX(0); } ' +
        '20% { transform: translateX(-8px); } ' +
        '40% { transform: translateX(8px); } ' +
        '60% { transform: translateX(-6px); } ' +
        '80% { transform: translateX(6px); } ' +
        '}';
    document.head.appendChild(shakeStyle);

})();
