import os
import re

template_dir = 'templates'
for fname in os.listdir(template_dir):
    if fname == 'base.html' or not fname.endswith('.html'): continue
    
    filepath = os.path.join(template_dir, fname)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if '<!DOCTYPE html>' in content:
        # Extract the content inside <main>
        match = re.search(r'<main[^>]*>(.*?)</main>', content, re.DOTALL)
        
        if match:
            main_content = match.group(1).strip()
            
            # Extract the page title from <h2> if exists to use as block title
            title_match = re.search(r'<h2[^>]*>(.*?)</h2>', main_content)
            page_title = title_match.group(1) if title_match else fname.replace('.html', '').replace('_', ' ').title()
            
            # Remove the <h2> from main_content since top-bar already shows it
            main_content = re.sub(r'<h2[^>]*>.*?</h2>', '', main_content, count=1).strip()
            
            # Check for extra scripts at the end of body
            scripts = ''
            script_match = re.search(r'</main>.*?(<script.*?</script>).*?</body>', content, re.DOTALL)
            if script_match:
                # We need to collect all script tags
                all_scripts = re.findall(r'<script.*?</script>', content, re.DOTALL)
                # Join them
                scripts_joined = '\n'.join(all_scripts)
                scripts = f"{{% block extra_js %}}\n{scripts_joined}\n{{% endblock %}}"
                
            new_content = f"{{% extends 'base.html' %}}\n{{% block title %}}{page_title}{{% endblock %}}\n{{% block page_title %}}{page_title}{{% endblock %}}\n\n{{% block content %}}\n{main_content}\n{{% endblock %}}\n\n{scripts}\n"
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f'Patched {fname}')
        else:
            print(f'Could not find <main> in {fname}')
