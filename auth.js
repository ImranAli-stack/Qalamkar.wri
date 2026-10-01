import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const authForms = document.querySelectorAll('[data-auth-form]');
const profilePage = document.querySelector('[data-profile-page]');
const authLinks = document.querySelector('[data-auth-links]');
let supabase;

authForms.forEach((form) => {
  if (form.dataset.authForm !== 'signup') return;

  const password = form.elements.password;
  const confirmPassword = form.elements.confirm_password;
  const validatePasswords = () => {
    confirmPassword.setCustomValidity(
      password.value === confirmPassword.value ? '' : 'Passwords do not match.',
    );
  };

  password.addEventListener('input', validatePasswords);
  confirmPassword.addEventListener('input', validatePasswords);
});

function showStatus(form, message, isError = false) {
  const status = form.querySelector('[data-auth-status]');
  status.textContent = message;
  status.dataset.state = isError ? 'error' : 'success';
}

if (!supabaseUrl || !supabaseKey) {
  authForms.forEach((form) => {
    showStatus(form, 'Authentication is not configured yet. Add the Supabase environment variables to enable it.', true);
  });
  if (profilePage) {
    profilePage.querySelector('[data-profile-status]').textContent = 'Add the Supabase environment variables to enable profiles.';
  }
} else {
  supabase = createClient(supabaseUrl, supabaseKey);

  if (authLinks) {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      authLinks.replaceChildren();
      const dashboardLink = document.createElement('a');
      dashboardLink.href = 'dashboard.html';
      dashboardLink.className = 'btn-ghost';
      dashboardLink.textContent = 'Dashboard';
      const profileLink = document.createElement('a');
      profileLink.href = 'profile.html';
      profileLink.className = 'btn-ghost';
      profileLink.textContent = 'My profile';
      const signOutButton = document.createElement('button');
      signOutButton.type = 'button';
      signOutButton.className = 'btn-ghost';
      signOutButton.textContent = 'Sign out';
      signOutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.assign('index.html');
      });
      authLinks.append(dashboardLink, profileLink, signOutButton);
    });
  }

  if (profilePage) {
    const form = profilePage.querySelector('[data-profile-form]');
    const status = profilePage.querySelector('[data-profile-status]');
    const submitButton = form.querySelector('[type="submit"]');
    const setProfileStatus = (message, isError = false) => {
      status.textContent = message;
      status.dataset.state = isError ? 'error' : 'success';
    };

    const loadProfile = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        window.location.assign('login.html');
        return;
      }

      profilePage.querySelector('[data-profile-email]').textContent = user.email || '';
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, bio, preferred_language, created_at')
        .eq('id', user.id)
        .single();

      if (error) {
        setProfileStatus('Your profile could not be loaded. Check that the Supabase profile migration has been applied.', true);
        submitButton.disabled = true;
        return;
      }

      for (const [field, value] of Object.entries(profile)) {
        const input = form.elements.namedItem(field);
        if (input) input.value = value ?? '';
      }
      profilePage.querySelector('[data-profile-name]').textContent = `${profile.first_name} ${profile.last_name}`.trim() || 'Writer';
      profilePage.querySelector('[data-profile-joined]').textContent = new Date(profile.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      });
      submitButton.disabled = false;
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return window.location.assign('login.html');
      const formData = new FormData(form);
      submitButton.disabled = true;
      setProfileStatus('Saving your profile...');
      const { error } = await supabase.from('profiles').update({
        username: formData.get('username').trim().toLowerCase(),
        first_name: formData.get('first_name').trim(),
        last_name: formData.get('last_name').trim(),
        bio: formData.get('bio').trim(),
        preferred_language: formData.get('preferred_language'),
      }).eq('id', user.id);
      submitButton.disabled = false;
      if (error) {
        setProfileStatus(error.code === '23505' ? 'That username is already taken.' : error.message, true);
        return;
      }
      profilePage.querySelector('[data-profile-name]').textContent = `${formData.get('first_name').trim()} ${formData.get('last_name').trim()}`.trim() || 'Writer';
      setProfileStatus('Profile saved. Opening your dashboard...');
      window.setTimeout(() => window.location.assign('dashboard.html'), 700);
    });

    loadProfile().catch((error) => setProfileStatus(error.message || 'Could not load your profile.', true));
  }

  authForms.forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('[type="submit"]');
      const formData = new FormData(form);
      submitButton.disabled = true;
      showStatus(form, 'Please wait...');

      try {
        const mode = form.dataset.authForm;
        let result;

        if (mode === 'signup') {
          const firstName = formData.get('first_name').trim();
          const lastName = formData.get('last_name').trim();
          const email = String(formData.get('email') || '').trim();
          const password = String(formData.get('password') || '');
          result = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName,
                last_name: lastName,
                full_name: `${firstName} ${lastName}`,
                username: formData.get('username').trim().toLowerCase(),
                preferred_language: formData.get('preferred_language') || 'en',
              },
              emailRedirectTo: `${window.location.origin}/login.html`,
            },
          });
          if (result.error) throw result.error;
          // Supabase returns a fake empty user when email confirmations are on
          // and the address is already registered — treat that as an error.
          if (!result.data.user) {
            throw new Error('Could not create account. Try a different email.');
          }
          if ((result.data.user.identities || []).length === 0) {
            throw new Error('An account with this email already exists. Please sign in.');
          }
          if (result.data.session) {
            showStatus(form, 'Account created. Set up your profile...');
            window.location.assign('profile.html');
          } else {
            showStatus(
              form,
              'Account created. Check your email to confirm, then sign in. (Or turn off Confirm email in Supabase Auth settings for instant signup.)',
            );
            window.setTimeout(() => window.location.assign('login.html'), 2500);
          }
        } else if (mode === 'login') {
          result = await supabase.auth.signInWithPassword({
            email: formData.get('email'),
            password: formData.get('password'),
          });
          if (result.error) throw result.error;
          showStatus(form, 'Signed in. Opening your dashboard...');
          window.location.assign('dashboard.html');
        } else if (mode === 'forgot-password') {
          result = await supabase.auth.resetPasswordForEmail(formData.get('email'), {
            redirectTo: `${window.location.origin}/reset-password.html`,
          });
          if (result.error) throw result.error;
          showStatus(form, 'If an account exists for that email, a password reset link is on its way.');
        } else if (mode === 'reset-password') {
          result = await supabase.auth.updateUser({ password: formData.get('password') });
          if (result.error) throw result.error;
          showStatus(form, 'Password updated. You can now sign in.');
          await supabase.auth.signOut();
          window.setTimeout(() => window.location.assign('login.html'), 1200);
        }
      } catch (error) {
        showStatus(form, error.message || 'Something went wrong. Please try again.', true);
      } finally {
        submitButton.disabled = false;
      }
    });
  });
}