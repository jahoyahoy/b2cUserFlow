(function () {
  let emailVerified = false;

  // FOR CUSTOM IDP
  const domains = ["@test.com"]; // Add more domains as needed
  const idpHintRedirects = {
    "@ahoyahoy.com": "whokta",
    "@test.com": "testIdP",
    // Add more domains and their corresponding IDP redirects here
  };

  // Check URL for hint param then if the hint param matches any IDP hint in idpHintRedirects
  // show notification for redirect
  function checkForHint() {
    const urlParams = new URLSearchParams(window.location.search);
    const hint = urlParams.get("hint");
    if (hint && Object.values(idpHintRedirects).some((idp) => idp === hint)) {
      // Show notification for custom idp users
      document.addEventListener("DOMContentLoaded", function () {
        const notification = document.querySelector(".domain-notification");
        if (notification) {
          notification.classList.add("show");
        }
      });
    }
  }

  // Email validation function
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Handle continue button click
  function handleContinue() {
    const emailInput = document.querySelector('#api input[type="email"]');
    const container = document.querySelector(".auth-container");
    const subtitle = document.querySelector(".auth-subtitle");
    const notification = document.querySelector(".domain-notification");

    if (!emailInput) return;

    const email = emailInput.value.toLowerCase().trim();

    if (!validateEmail(email)) {
      showEmailError("Please enter a valid email address");
      return;
    }

    // Clear any previous errors
    clearEmailError();

    // FOR CUSTOM IDP
    // THIS IS WHERE WE HANDLE DOMAIN CHECKING AND IDP REDIRECTS
    if (domains.some((domain) => email.endsWith(domain))) {
      // If email matches any domain in the list
      // add redirect hint to URL and redirect to the corresponding IDP - Azure does this based on the hint in the IDP list
      const domain = domains.find((d) => email.endsWith(d));
      if (idpHintRedirects[domain]) {
        // Redirect to the corresponding IDP
        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set("hint", idpHintRedirects[domain]);
        window.history.replaceState({}, "", currentUrl.toString());

        // Show notification
        if (notification) {
          notification.classList.add("show");
          notification.innerHTML =
            "Redirecting to your organization's sign-in page...";
        }

        setTimeout(() => {
          if (subtitle) {
            subtitle.textContent = "Please wait while we redirect you...";
          }
        }, 1000);
      }
    } else {
      // for all other domains, follow local account flow
      emailVerified = true;
      container.classList.add("email-verified");

      // Update subtitle
      if (subtitle) {
        subtitle.textContent = "Now enter your password to sign in";
      }

      // Focus on password field when it appears
      setTimeout(() => {
        const passwordInput = document.querySelector(
          '#api input[type="password"]'
        );
        if (passwordInput) {
          passwordInput.focus();
        }
      }, 300);
    }
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

  // Monitor for email input changes with enhanced timing
  function monitorEmailInput() {
    // Multiple timing strategies to ensure B2C elements are loaded
    function initializeEmailMonitoring() {
      const emailInput = document.querySelector('#api input[type="email"]');
      const apiContainer = document.getElementById("api");

      if (!emailInput || !apiContainer) {
        // If elements aren't ready, try again
        console.log("B2C elements not ready, retrying...");
        return false;
      }

      console.log("Initializing email monitoring...");

      // Create and insert continue button
      const continueBtn = document.createElement("button");
      continueBtn.type = "button";
      continueBtn.className = "continue-btn";
      continueBtn.textContent = "Continue";
      continueBtn.disabled = true;

      // Insert continue button after the email input
      emailInput.parentNode.insertBefore(continueBtn, emailInput.nextSibling);
      console.log("Continue button added");

      // Handle continue button click
      continueBtn.addEventListener("click", handleContinue);

      // Monitor email input for validation
      emailInput.addEventListener("input", function () {
        const email = this.value.trim();
        const isValid = validateEmail(email);
        const container = document.querySelector(".auth-container");
        const notification = document.querySelector(".domain-notification");
        const subtitle = document.querySelector(".auth-subtitle");

        continueBtn.disabled = !isValid;

        // If email is empty or invalid, reset everything to initial state
        if (!email || !isValid) {
          emailVerified = false;
          container.classList.remove("email-verified");

          // Reset subtitle to original text
          if (subtitle) {
            subtitle.textContent = "Sign in to your account to continue";
          }

          // Hide notification
          if (notification) {
            notification.classList.remove("show");
          }

          // Clear errors
          clearEmailError();
          return;
        }

        // If we had previously verified an email and user is changing it,
        // reset the verified state but keep the continue button enabled
        if (emailVerified && isValid) {
          emailVerified = false;
          container.classList.remove("email-verified");

          // Reset subtitle
          if (subtitle) {
            subtitle.textContent = "Sign in to your account to continue";
          }
        }
        // Hide notification if not part of any domain
        if (notification && !domains.some((domain) => email.endsWith(domain))) {
          // FOR DOMAIN CHECKING
          notification.classList.remove("show");
        }

        // Clear errors when typing
        clearEmailError();
      });

      // Handle Enter key in email field
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

    // The 3 functions below are to assist with email monitoring and making sure the continue button is added correctly

    // Wait for DOMContentLoaded 1
    document.addEventListener("DOMContentLoaded", function () {
      console.log("DOM Content Loaded");

      // Try multiple times with increasing delays
      const attempts = [500, 1000, 1500, 2000, 3000];
      let attemptIndex = 0;

      function tryInitialize() {
        if (initializeEmailMonitoring()) {
          console.log("Email monitoring initialized successfully");
          return;
        }

        attemptIndex++;
        if (attemptIndex < attempts.length) {
          console.log(
            `Attempt ${attemptIndex + 1} in ${attempts[attemptIndex]}ms`
          );
          setTimeout(tryInitialize, attempts[attemptIndex]);
        } else {
          console.error(
            "Failed to initialize email monitoring after all attempts"
          );
        }
      }

      tryInitialize();
    });

    // Also try when page is fully loaded 2
    window.addEventListener("load", function () {
      console.log("Window loaded");
      setTimeout(() => {
        if (!document.querySelector(".continue-btn")) {
          console.log(
            "Continue button not found after window load, trying again..."
          );
          initializeEmailMonitoring();
        }
      }, 1000);
    });

    // Watch for B2C API container changes 3
    if (window.MutationObserver) {
      const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.type === "childList") {
            const emailInput = document.querySelector(
              '#api input[type="email"]'
            );
            if (emailInput && !document.querySelector(".continue-btn")) {
              console.log("B2C elements detected via mutation observer");
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

              // Try to trigger continue instead
              const continueBtn = document.querySelector(".continue-btn");
              if (continueBtn && !continueBtn.disabled) {
                handleContinue();
              }
              return false;
            }

            // If we get here, allow normal submission
            document.querySelector(".auth-container").classList.add("loading");
          });
        });
      }, 500);
    });
  }

  // Enhanced form styling after B2C injection
  function enhanceB2CForm() {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(function () {
        const apiContainer = document.getElementById("api");
        if (apiContainer) {
          apiContainer.addEventListener("focusin", function (e) {
            if (e.target.matches("input")) {
              apiContainer.classList.add("focused");
            }
          });

          apiContainer.addEventListener("focusout", function (e) {
            if (e.target.matches("input")) {
              apiContainer.classList.remove("focused");
            }
          });
        }

        // Add SSO toggle functionality (for admin/debug purposes)
        window.toggleSSO = function () {
          const container = document.querySelector(".auth-container");
          container.classList.toggle("show-sso");
        };
      }, 500);
    });
  }

  // Initialize all functions
  checkForHint();
  monitorEmailInput();
  preventPrematureSubmission();
  enhanceB2CForm();
})();
