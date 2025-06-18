(function () {
  let emailVerified = false;

  /// Current hints:
  // "whokta" for Western Health Okta

  // Domain configuration for custom IDP redirects
  // const domains = ["@whtest.com"]; // Add more domains as needed
  // const idpHintRedirects = {
  //   "@whtest.com": "whokta",
  // };

  // e.g. { "@domain.com" : "idpHint"}
  // hints are set against IDPs in azure
  const idpRedirects = {
    "@whtest.com": "whokta",
  };

  // validate email
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // checks if email is prefilled by password manager/browser
  function checkPrefilledEmail() {
    const emailInput = document.querySelector('#api input[type="email"]');
    const continueBtn = document.querySelector(".continue-btn");

    if (emailInput && continueBtn) {
      const email = emailInput.value.trim();
      const isValid = validateEmail(email);
      continueBtn.disabled = !isValid;
    }
  }

  function handleContinue() {
    // get elements
    const emailInput = document.querySelector('#api input[type="email"]');
    const container = document.querySelector(".auth-container");
    const subtitle = document.querySelector(".auth-subtitle");

    if (!emailInput) {
      return;
    }

    const email = emailInput.value.toLowerCase().trim();

    if (!validateEmail(email)) {
      showEmailError("Please enter a valid email address");
      return;
    }

    // Clear any previous errors
    clearEmailError();

    // Check for custom IDP domains
    if (Object.keys(idpRedirects).some((domain) => email.endsWith(domain))) {
      const domain = Object.keys(idpRedirects).find((d) => email.endsWith(d));
      if (idpRedirects[domain]) {
        // Redirect to custom IDP
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set("domain_hint", idpRedirects[domain]);
        window.history.replaceState({}, "", currentUrl.toString());
        location.reload(); // reload page with appended domain_hint

        return;
      }
    }

    // all other email domains will use default B2C sign-in flow
    emailVerified = true;
    container.classList.add("email-verified");

    if (subtitle) {
      subtitle.textContent = "Now enter your password to sign in";
    }

    // Move forgot password link after password field
    setTimeout(() => {
      const passwordInput = document.querySelector(
        '#api input[type="password"]'
      );
      const forgotPassword = document.getElementById("forgotPassword");

      if (passwordInput && forgotPassword) {
        passwordInput.parentNode.insertBefore(
          forgotPassword,
          passwordInput.nextSibling
        );
        passwordInput.focus();
      }
    }, 300);
  }

  // Show email validation error
  function showEmailError(message) {
    clearEmailError();
    const emailInput = document.querySelector('#api input[type="email"]');
    if (emailInput) {
      const errorDiv = document.createElement("div");
      errorDiv.className = "field-validation-error";
      errorDiv.textContent = message;
      emailInput.parentNode.insertBefore(errorDiv, emailInput.nextSibling);
      emailInput.style.borderColor = "#e74c3c";
    }
  }

  // Clear email validation error
  function clearEmailError() {
    const existingError = document.querySelector(".field-validation-error");
    if (existingError) {
      existingError.remove();
    }
    const emailInput = document.querySelector('#api input[type="email"]');
    if (emailInput) {
      emailInput.style.borderColor = "#e1e5e9";
    }
  }

  // Monitor for email input changes
  function monitorEmailInput() {
    function initializeEmailMonitoring() {
      const emailInput = document.querySelector('#api input[type="email"]');
      const apiContainer = document.getElementById("api");

      if (!emailInput || !apiContainer) {
        return false;
      }

      // Check if continue button already exists
      if (document.querySelector(".continue-btn")) {
        checkPrefilledEmail();
        return true;
      }

      // Create and insert continue button
      const continueBtn = document.createElement("button");
      continueBtn.type = "button";
      continueBtn.className = "continue-btn";
      continueBtn.textContent = "Continue";
      continueBtn.disabled = true;

      // Insert continue button after the email input
      emailInput.parentNode.insertBefore(continueBtn, emailInput.nextSibling);

      // Check for prefilled email after button is added
      checkPrefilledEmail();

      // Handle continue button click
      continueBtn.addEventListener("click", handleContinue);

      // Monitor email input for validation
      emailInput.addEventListener("input", function () {
        const email = this.value.trim();
        const isValid = validateEmail(email);
        const container = document.querySelector(".auth-container");
        const subtitle = document.querySelector(".auth-subtitle");

        continueBtn.disabled = !isValid;

        // Reset state if email is empty or invalid
        if (!email || !isValid) {
          emailVerified = false;
          container.classList.remove("email-verified");

          if (subtitle) {
            subtitle.textContent = "Sign in to your account to continue";
          }

          clearEmailError();
          return;
        }

        // Reset verified state when changing email
        if (emailVerified && isValid) {
          emailVerified = false;
          container.classList.remove("email-verified");

          if (subtitle) {
            subtitle.textContent = "Sign in to your account to continue";
          }
        }

        clearEmailError();
      });

      // Add listeners for all types of email input changes
      emailInput.addEventListener("change", function () {
        checkPrefilledEmail();
      });

      emailInput.addEventListener("paste", function () {
        setTimeout(() => {
          checkPrefilledEmail();
        }, 100);
      });

      emailInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!continueBtn.disabled) {
            handleContinue();
          }
        }
      });

      return true;
    }

    // Wait for DOMContentLoaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        // Try multiple times with increasing delays
        const attempts = [100, 500, 1000, 1500, 2000, 3000];
        let attemptIndex = 0;

        function tryInitialize() {
          if (initializeEmailMonitoring()) {
            return;
          }

          attemptIndex++;
          if (attemptIndex < attempts.length) {
            setTimeout(tryInitialize, attempts[attemptIndex]);
          }
        }

        tryInitialize();
      });
    } else {
      setTimeout(() => initializeEmailMonitoring(), 100);
    }

    // Also try when page is fully loaded
    window.addEventListener("load", function () {
      setTimeout(() => {
        if (!document.querySelector(".continue-btn")) {
          initializeEmailMonitoring();
        } else {
          checkPrefilledEmail();
        }
      }, 1000);
    });

    // Watch for B2C API container changes
    if (window.MutationObserver) {
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            const emailInput = document.querySelector(
              '#api input[type="email"]'
            );
            if (emailInput && !document.querySelector(".continue-btn")) {
              setTimeout(() => initializeEmailMonitoring(), 500);
            }
          }
        });
      });

      // Start observing when the API container exists
      const checkForApi = setInterval(() => {
        const apiContainer = document.getElementById("api");
        if (apiContainer) {
          observer.observe(apiContainer, {
            childList: true,
            subtree: true,
          });
          clearInterval(checkForApi);
        }
      }, 100);
    }
  }

  // Prevent form submission until email is verified
  function preventPrematureSubmission() {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(function () {
        const forms = document.querySelectorAll("#api form");

        forms.forEach(function (form) {
          form.addEventListener("submit", function (e) {
            if (!emailVerified) {
              e.preventDefault();
              e.stopPropagation();

              const continueBtn = document.querySelector(".continue-btn");
              if (continueBtn && !continueBtn.disabled) {
                handleContinue();
              }
              return false;
            }

            document.querySelector(".auth-container").classList.add("loading");
          });
        });
      }, 500);
    });
  }

  // Initialize all functions
  monitorEmailInput();
  preventPrematureSubmission();
})();
