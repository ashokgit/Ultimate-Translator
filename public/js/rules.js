document.addEventListener('DOMContentLoaded', () => {
    const rulesContainer = document.getElementById('rules-container');
    const saveButton = document.getElementById('saveButton');
    const notification = document.getElementById('notification');
    let originalRules = {};

    const tooltips = {
        nonTranslatableKeys: "A list of JSON keys that should never be translated. Useful for identifiers, codes, or technical fields (e.g., 'id', 'url', 'api_key').",
        keyPatterns: "A list of regular expression (regex) patterns. If a JSON key matches any of these patterns, it will not be translated (e.g., '.*_id$', '.*_url$').",
        valuePatterns: "A list of regex patterns. If a value associated with a key matches any of these patterns, it will not be translated (e.g., URLs, email addresses, dates).",
        contentTypeRules: "Define specific rules for different types of content, like e-commerce or a CMS. You can preserve specific keys or patterns within these content types.",
        autoDetection: "Configure the system to automatically learn and suggest new non-translatable keys or patterns based on the content it processes.",
        customerOverrides: "Define special rules for specific customers who may have unique non-translatable fields.",
        analytics: "Settings for tracking and reporting on how translation rules are applied.",
        autoDetectedPatterns: "A list of patterns that the system has automatically detected as likely non-translatable. Review and move them to 'keyPatterns' if they are correct."
    };

    async function fetchRules() {
        try {
            const response = await fetch('/api/v1/translation-rules');
            if (!response.ok) throw new Error('Failed to fetch rules.');
            const rules = await response.json();
            originalRules = JSON.parse(JSON.stringify(rules)); // Deep copy for later comparison
            renderRules(rules);
        } catch (error) {
            showNotification(error.message, 'danger');
        }
    }

    function renderRules(rules) {
        rulesContainer.innerHTML = '';
        for (const key in rules) {
            if (key === 'lastUpdated') continue; // skip if present
            const section = document.createElement('div');
            section.className = 'rule-section';
            section.dataset.key = key;

            const value = rules[key];
            let content;

            if (key === 'version') {
                content = `<input type="text" class="editable-value" value="${value}" readonly title="Version is auto-incremented on save">`;
            } else if (key === 'nonTranslatableKeys') {
                content = `<div id="ntk-tags" class="tags-container"></div>
                    <div style="margin-top:10px;display:flex;gap:8px;">
                        <input type="text" id="ntk-input" placeholder="Add key..." style="flex:1;">
                        <button type="button" id="ntk-add" class="btn btn-primary">Add</button>
                    </div>`;
            } else if (Array.isArray(value)) {
                content = `<textarea class="editable-list">${value.join('\n')}</textarea>`;
            } else if (typeof value === 'object' && value !== null) {
                content = `<pre class="editable-json" contenteditable="true">${JSON.stringify(value, null, 2)}</pre>`;
            } else {
                content = `<input type="text" class="editable-value" value="${value}">`;
            }

            section.innerHTML = `
                <h2>
                    ${formatTitle(key)}
                    <div class="tooltip">
                        <span class="tooltip-icon">?</span>
                        <span class="tooltiptext">${tooltips[key] || 'No description available.'}</span>
                    </div>
                </h2>
                ${content}
            `;
            rulesContainer.appendChild(section);

            // Special handling for Non Translatable Keys tags
            if (key === 'nonTranslatableKeys') {
                renderNTKTags(value);
                setTimeout(() => {
                    document.getElementById('ntk-add').onclick = () => {
                        const input = document.getElementById('ntk-input');
                        const val = input.value.trim();
                        if (val && !value.includes(val)) {
                            value.push(val);
                            renderNTKTags(value);
                            input.value = '';
                        }
                    };
                }, 0);
            }
        }
    }

    function renderNTKTags(keys) {
        const container = document.getElementById('ntk-tags');
        if (!container) return;
        container.innerHTML = '';
        keys.forEach((key, idx) => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = key;
            const remove = document.createElement('span');
            remove.className = 'tag-remove';
            remove.textContent = '×';
            remove.onclick = () => {
                keys.splice(idx, 1);
                renderNTKTags(keys);
            };
            tag.appendChild(remove);
            container.appendChild(tag);
        });
    }

    async function saveRules() {
        const updatedRules = {};
        const sections = rulesContainer.querySelectorAll('.rule-section');
        
        for (const section of sections) {
            const key = section.dataset.key;
            if (key === 'lastUpdated') continue;
            const editable = section.querySelector('.editable-list, .editable-json, .editable-value');
            let value;

            if (key === 'version') {
                value = editable.value; // will be ignored by backend
            } else if (key === 'nonTranslatableKeys') {
                value = [];
                section.querySelectorAll('.tag').forEach(tag => {
                    value.push(tag.childNodes[0].textContent);
                });
            } else if (editable && editable.classList.contains('editable-list')) {
                value = editable.value.split('\n').map(s => s.trim()).filter(Boolean);
            } else if (editable && editable.classList.contains('editable-json')) {
                try {
                    value = JSON.parse(editable.innerText);
                } catch (e) {
                    showNotification(`Invalid JSON in section '${formatTitle(key)}'. Changes not saved.`, 'danger');
                    return;
                }
            } else if (editable) {
                value = editable.value;
            }
            updatedRules[key] = value;
        }

        try {
            const response = await fetch('/api/v1/translation-rules', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedRules),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save rules.');
            }
            
            showNotification('Translation rules saved successfully!', 'success');
            originalRules = JSON.parse(JSON.stringify(updatedRules));
        } catch (error) {
            showNotification(error.message, 'danger');
        }
    }

    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.className = `alert alert-${type}`;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
    
    function formatTitle(key) {
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }

    saveButton.addEventListener('click', saveRules);

    fetchRules();
}); 