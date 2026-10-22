import { BOARDS, EXAMS, SAMPLE_RESULTS, SAMPLE_INSTITUTIONS } from './data.js';

// Global copy helper for terminal blocks
window.copyCode = async function(btn, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const text = target.textContent || '';
  try {
    await navigator.clipboard.writeText(text);
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check2 text-success"></i> <span>Copied</span>';
    setTimeout(() => {
      btn.innerHTML = origHtml;
    }, 1500);
  } catch (err) {
    console.error('Clipboard copy failed:', err);
  }
};

// Setup Alpine
document.addEventListener('alpine:init', () => {
  // Theme Manager
  Alpine.store('theme', {
    current: localStorage.getItem('boardapi-theme') || 'dark',
    init() {
      this.apply();
    },
    toggle() {
      this.current = this.current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('boardapi-theme', this.current);
      this.apply();
    },
    apply() {
      document.documentElement.setAttribute('data-bs-theme', this.current);
      const prismDark = document.getElementById('prism-dark');
      const prismLight = document.getElementById('prism-light');
      if (prismDark && prismLight) {
        prismDark.disabled = this.current !== 'dark';
        prismLight.disabled = this.current === 'dark';
      }
    }
  });

  // Global API metadata helper
  Alpine.store('apiData', {
    boards: BOARDS,
    exams: EXAMS,
    origin: window.location.origin
  });

  // Endpoint 1: get-result component
  Alpine.data('getResultEndpoint', () => ({
    activeTab: 'params',
    method: 'GET',
    form: {
      exam: 'ssc',
      board: 'jessore',
      year: 2025,
      roll: 617381,
      reg: 2213489227,
      maxCaptchaRetry: ''
    },
    loading: false,
    response: null,
    statusCode: null,
    statusText: '',
    duration: null,
    isSuccess: false,
    errorMessage: '',

    init() {
      this.$watch('method', () => this.highlightPreview());
      this.$watch('form', () => this.highlightPreview(), { deep: true });
      this.$nextTick(() => this.highlightPreview());
    },

    fillRandom() {
      const item = SAMPLE_RESULTS[Math.floor(Math.random() * SAMPLE_RESULTS.length)];
      this.form = {
        exam: item.exam,
        board: item.board,
        year: item.year,
        roll: item.roll,
        reg: item.reg,
        maxCaptchaRetry: item.maxCaptchaRetry || ''
      };
      this.highlightPreview();
    },

    get previewCommand() {
      const origin = window.location.origin;
      const params = new URLSearchParams();
      if (this.form.exam) params.set('exam', this.form.exam);
      if (this.form.board) params.set('board', this.form.board);
      if (this.form.year) params.set('year', this.form.year);
      if (this.form.roll) params.set('roll', this.form.roll);
      if (this.form.reg) params.set('reg', this.form.reg);
      if (this.form.maxCaptchaRetry) params.set('maxCaptchaRetry', this.form.maxCaptchaRetry);

      if (this.method === 'GET') {
        const qs = params.toString();
        return `curl "${origin}/api/get-result${qs ? '?' + qs : ''}"`;
      } else {
        const bodyObj = {};
        for (const [k, v] of Object.entries(this.form)) {
          if (v !== '' && v !== null && v !== undefined) {
            bodyObj[k] = ['year', 'roll', 'reg', 'maxCaptchaRetry'].includes(k) ? Number(v) : v;
          }
        }
        return `curl -X POST "${origin}/api/get-result" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(bodyObj)}'`;
      }
    },

    highlightPreview() {
      this.$nextTick(() => {
        const el = document.getElementById('preview-get-result');
        if (el && window.Prism) {
          window.Prism.highlightElement(el);
        }
      });
    },

    async execute() {
      this.loading = true;
      this.response = null;
      this.errorMessage = '';
      const start = performance.now();

      try {
        const origin = window.location.origin;
        let res;

        if (this.method === 'GET') {
          const params = new URLSearchParams();
          if (this.form.exam) params.set('exam', this.form.exam);
          if (this.form.board) params.set('board', this.form.board);
          if (this.form.year) params.set('year', this.form.year);
          if (this.form.roll) params.set('roll', this.form.roll);
          if (this.form.reg) params.set('reg', this.form.reg);
          if (this.form.maxCaptchaRetry) params.set('maxCaptchaRetry', this.form.maxCaptchaRetry);

          res = await fetch(`${origin}/api/get-result?${params.toString()}`);
        } else {
          const bodyObj = {};
          for (const [k, v] of Object.entries(this.form)) {
            if (v !== '' && v !== null && v !== undefined) {
              bodyObj[k] = ['year', 'roll', 'reg', 'maxCaptchaRetry'].includes(k) ? Number(v) : v;
            }
          }
          res = await fetch(`${origin}/api/get-result`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyObj)
          });
        }

        this.duration = Math.round(performance.now() - start);
        this.statusCode = res.status;
        this.statusText = res.statusText || (res.ok ? 'OK' : 'Error');

        const rawJson = await res.json().catch(() => ({ msg: 'Invalid JSON response from server' }));
        this.isSuccess = res.ok && rawJson.success === true;
        this.response = JSON.stringify(rawJson, null, 2);

        this.$nextTick(() => {
          const codeEl = document.getElementById('response-get-result');
          if (codeEl && window.Prism) {
            window.Prism.highlightElement(codeEl);
          }
        });
      } catch (err) {
        this.duration = Math.round(performance.now() - start);
        this.statusCode = 0;
        this.statusText = 'Network Error';
        this.isSuccess = false;
        this.errorMessage = err.message || 'Network request failed';
      } finally {
        this.loading = false;
      }
    }
  }));

  // Endpoint 2: get-institutions component
  Alpine.data('getInstitutionsEndpoint', () => ({
    activeTab: 'params',
    form: {
      board: 'jessore',
      exam: 'ssc',
      year: 2025,
      type: 'flat'
    },
    loading: false,
    response: null,
    statusCode: null,
    statusText: '',
    duration: null,
    isSuccess: false,
    errorMessage: '',

    init() {
      this.$watch('form', () => this.highlightPreview(), { deep: true });
      this.$nextTick(() => this.highlightPreview());
    },

    fillRandom() {
      const item = SAMPLE_INSTITUTIONS[Math.floor(Math.random() * SAMPLE_INSTITUTIONS.length)];
      this.form = {
        board: item.board,
        exam: item.exam,
        year: item.year !== undefined ? item.year : '',
        type: item.type || 'flat'
      };
      this.highlightPreview();
    },

    get previewCommand() {
      const origin = window.location.origin;
      const params = new URLSearchParams();
      if (this.form.board) params.set('board', this.form.board);
      if (this.form.exam) params.set('exam', this.form.exam);
      if (this.form.year) params.set('year', this.form.year);
      if (this.form.type) params.set('type', this.form.type);

      const qs = params.toString();
      return `curl "${origin}/api/get-institutions${qs ? '?' + qs : ''}"`;
    },

    highlightPreview() {
      this.$nextTick(() => {
        const el = document.getElementById('preview-get-institutions');
        if (el && window.Prism) {
          window.Prism.highlightElement(el);
        }
      });
    },

    async execute() {
      this.loading = true;
      this.response = null;
      this.errorMessage = '';
      const start = performance.now();

      try {
        const origin = window.location.origin;
        const params = new URLSearchParams();
        if (this.form.board) params.set('board', this.form.board);
        if (this.form.exam) params.set('exam', this.form.exam);
        if (this.form.year) params.set('year', this.form.year);
        if (this.form.type) params.set('type', this.form.type);

        const res = await fetch(`${origin}/api/get-institutions?${params.toString()}`);
        this.duration = Math.round(performance.now() - start);
        this.statusCode = res.status;
        this.statusText = res.statusText || (res.ok ? 'OK' : 'Error');

        const rawJson = await res.json().catch(() => ({ msg: 'Invalid JSON response from server' }));
        this.isSuccess = res.ok && rawJson.success === true;
        this.response = JSON.stringify(rawJson, null, 2);

        this.$nextTick(() => {
          const codeEl = document.getElementById('response-get-institutions');
          if (codeEl && window.Prism) {
            window.Prism.highlightElement(codeEl);
          }
        });
      } catch (err) {
        this.duration = Math.round(performance.now() - start);
        this.statusCode = 0;
        this.statusText = 'Network Error';
        this.isSuccess = false;
        this.errorMessage = err.message || 'Network request failed';
      } finally {
        this.loading = false;
      }
    }
  }));
});
