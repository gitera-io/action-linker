function processPage() {
  const textarea = document.querySelector('textarea[data-testid="read-only-cursor-text-area"]');
  
  if (textarea) {
    const textareaContent = textarea.value;
    const container = textarea.parentElement;
    
    // Ensure container exists and supports absolute positioning
    if (!container) return;
    container.style.position = "relative";

    // Remove previously injected buttons
    const existingButtons = container.querySelectorAll('.github-linker-button');
    existingButtons.forEach(button => button.remove());

    const fragment = document.createDocumentFragment();

    // Match workflow and action references:
    // 1. Full remote workflow: org/repo/.github/workflows/file.yml@ref
    // 2. Local workflow: ./.github/workflows/file.yml
    // 3. Remote action in subpath: org/repo/.github/actions/action-name@ref
    // 4. Standard action: org/repo@ref
    const usesRegex = /uses:\s+((?:[\w-]+\/[\w-]+\/\.github\/workflows\/[\w-]+\.ya?ml@[\w.-]+)|(?:[\w-]+\/[\w-]+\/\.github\/actions\/[\w-]+@[\w.-]+)|(?:[\w-]+\/[\w-]+@[\w.-]+)|(?:\.\/\.github\/workflows\/[\w-]+\.ya?ml))/g;
    let match;
    
    while ((match = usesRegex.exec(textareaContent)) !== null) {
      const workflowPath = match[1];
      let workflowUrl;
      
      // Determine if local or remote workflow
      if (workflowPath.startsWith('./')) {
        const repoUrlMatch = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)/);
        if (repoUrlMatch) {
          const repoOwner = repoUrlMatch[1];
          const repoName = repoUrlMatch[2];
          
          // Resolve current branch/tag ref from the page UI
          let branch = 'main';
          const refElement = document.querySelector('[data-testid="anchor-button"].ref-selector-class');
          if (refElement) {
            const refText = refElement.querySelector('.prc-Text-Text-0ima0')?.textContent?.trim();
            if (refText) {
              branch = refText;
            } else {
              const fullText = refElement.textContent.trim();
              const cleanText = fullText.replace(/\s+/g, ' ').trim();
              if (cleanText) {
                branch = cleanText;
              }
            }
          }
          
          const localPath = workflowPath.substring(2);
          workflowUrl = `https://github.com/${repoOwner}/${repoName}/blob/${branch}/${localPath}`;
        }
      } else {
        // External action in standard org/repo@ref format
        const standardActionRegex = /^([\w-]+\/[\w-]+)@([\w.-]+)$/;
        const standardActionMatch = workflowPath.match(standardActionRegex);
        
        if (standardActionMatch) {
          const repoPath = standardActionMatch[1];
          const ref = standardActionMatch[2];
          workflowUrl = `https://github.com/${repoPath}/tree/${ref}`;
        } else {
          // Remote action or workflow path
          const [pathWithoutRef, ref] = workflowPath.split('@');
          const [repoOwner, repoName, ...pathParts] = pathWithoutRef.split('/');
          const filePath = pathParts.join('/');
          
          const isAction = filePath.includes('/actions/');
          if (isAction) {
            workflowUrl = `https://github.com/${repoOwner}/${repoName}/tree/${ref}/${filePath}`;
          } else {
            workflowUrl = `https://github.com/${repoOwner}/${repoName}/blob/${ref}/${filePath}`;
          }
        }
      }
      
      if (workflowUrl) {
        // Calculate line offset in the text area
        const lineStartIndex = textareaContent.lastIndexOf('\n', match.index) + 1;
        const lineEndIndex = textareaContent.indexOf('\n', match.index);
        const lineText = textareaContent.substring(lineStartIndex, lineEndIndex !== -1 ? lineEndIndex : textareaContent.length);
        
        const button = document.createElement("button");
        button.classList.add('github-linker-button');
        
        let itemType = "GitHub Action";
        if (workflowPath.includes('/workflows/')) {
          itemType = "Reusable Workflow";
        } else if (workflowPath.match(/^[\w-]+\/[\w-]+@[\w.-]+$/)) {
          itemType = "External GitHub Action";
        }
        
        const externalLinkIconSvg = `<svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor">
            <path fill-rule="evenodd" d="M10.604 1h4.146a.25.25 0 01.25.25v4.146a.25.25 0 01-.427.177L13.03 4.03 9.28 7.78a.75.75 0 01-1.06-1.06l3.75-3.75-1.543-1.543A.25.25 0 0110.604 1zM3.75 2A1.75 1.75 0 002 3.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 12.25v-3.5a.75.75 0 00-1.5 0v3.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-8.5a.25.25 0 01.25-.25h3.5a.75.75 0 000-1.5h-3.5z"></path>
        </svg>`;
        
        button.innerHTML = `
          <span style="display: inline-flex; align-items: center; gap: 3px; font-size: 12px;">
            <span>Go</span>
            ${externalLinkIconSvg.replace('height="16"', 'height="11"').replace('width="16"', 'width="11"')}
          </span>
        `;
        button.style.position = "absolute";
        button.style.cursor = "pointer";
        button.title = `Open ${itemType}: ${workflowPath}`;
        
        button.style.background = "#f6f8fa";
        button.style.color = "#0969da";
        button.style.border = "1px solid rgba(31, 35, 40, 0.15)";
        button.style.borderRadius = "5px";
        button.style.padding = "2px 6px";
        button.style.fontSize = "12px";
        button.style.fontWeight = "500";
        button.style.lineHeight = "1";
        button.style.transition = "all 0.2s cubic-bezier(0.3, 0, 0.5, 1)";
        button.style.zIndex = "1000";
        button.style.boxShadow = "0 1px 0 rgba(27, 31, 36, 0.04)";

        button.addEventListener("mouseover", () => {
            button.style.background = "#f3f4f6";
            button.style.color = "#0969da";
            button.style.textDecoration = "none";
            button.style.borderColor = "rgba(31, 35, 40, 0.2)";
        });

        button.addEventListener("mouseout", () => {
            button.style.background = "#f6f8fa";
            button.style.color = "#0969da";
            button.style.textDecoration = "none";
            button.style.borderColor = "rgba(31, 35, 40, 0.15)";
        });

        button.addEventListener("mousedown", () => {
            button.style.background = "#e7e9eb";
            button.style.color = "#0550ae";
            button.style.boxShadow = "inset 0 1px 0 rgba(27, 31, 36, 0.1)";
        });
        
        button.addEventListener("mouseup", () => {
            const isHovering = button.matches(':hover');
            button.style.background = isHovering ? "#f3f4f6" : "#f6f8fa";
            button.style.color = "#0969da";
            button.style.boxShadow = "0 1px 0 rgba(27, 31, 36, 0.04)";
            button.style.borderColor = isHovering ? "rgba(31, 35, 40, 0.2)" : "rgba(31, 35, 40, 0.15)";
        });
        
        button.addEventListener("click", (e) => {
          e.stopPropagation();
          window.open(workflowUrl, "_blank");
        });
        
        // Position button relative to the line and "uses:" keyword
        const lineNumber = (textareaContent.substring(0, lineStartIndex).match(/\n/g) || []).length;
        const computedStyle = getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
        const usesIndex = lineText.indexOf('uses:');
        
        if (usesIndex !== -1) {
          const beforeUsesText = lineText.substring(0, usesIndex);
          const beforeUsesWidth = getTextWidth(beforeUsesText, computedStyle.font);
          const textareaPaddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
          
          button.style.left = `${textareaPaddingLeft + beforeUsesWidth - 50}px`;
          button.style.top = `${lineNumber * lineHeight}px`;
        } else {
          const textareaPaddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
          button.style.left = `${textareaPaddingLeft + 5}px`;
          button.style.top = `${lineNumber * lineHeight}px`;
        }
        
        fragment.appendChild(button);
      }
    }
    container.appendChild(fragment);
  }
}

// Helper to measure text width using a canvas
function getTextWidth(text, font) {
  const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
  const context = canvas.getContext("2d");
  context.font = font;
  const metrics = context.measureText(text);
  return metrics.width;
}

// Concurrency control and debouncing
let isProcessing = false;
let processTimeout = null;

// Observe DOM mutations to re-inject buttons when workflow file view updates
const observer = new MutationObserver((mutations) => {
  const textarea = document.querySelector('textarea[data-testid="read-only-cursor-text-area"]');
  if (!textarea || isProcessing) return;

  if (processTimeout) {
    clearTimeout(processTimeout);
  }

  processTimeout = setTimeout(() => {
    if (!isProcessing) {
      isProcessing = true;
      observer.disconnect();
      try {
        processPage();
      } catch (error) {
        console.error("GitHub Linker Extension: Error during processPage:", error);
      } finally {
        isProcessing = false;
        const targetNode = document.querySelector('.react-code-view-edit-content-container') || document.body;
        if (targetNode) {
          startObserver(targetNode);
        }
      }
    }
  }, 500);
});

// Start observing target node for changes
const startObserver = (targetNode) => {
  if (!targetNode) return;
  try {
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false
    });
  } catch (error) {
    console.error("GitHub Linker Extension: Failed to start observer:", error);
  }
};

// Initial execution
setTimeout(() => {
  try {
    processPage();
    const initialTargetNode = document.querySelector('.react-code-view-edit-content-container') || document.body;
    startObserver(initialTargetNode);
  } catch (error) {
    console.error("GitHub Linker Extension: Error during initial run:", error);
  }
}, 1000);