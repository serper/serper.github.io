document.addEventListener('DOMContentLoaded', function() {
    // Configuration variables
    const username = 'serper'; // Your GitHub username
    const projectsContainer = document.getElementById('projects-container');
    const loading = document.getElementById('loading');
    const techFilters = document.getElementById('tech-filters');
    const yearElement = document.getElementById('year');
    
    // Update current year in footer
    yearElement.textContent = new Date().getFullYear();

    // Toggle for dark theme
    const themeToggle = document.getElementById('checkbox');
    
    // Check saved theme preference
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
    }
    
    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });

    // Function to detect and extract technologies from README or description
    function detectTechnologies(readme, description) {
        const techKeywords = {
            'javascript': ['javascript', 'js', 'node', 'react', 'vue', 'angular', 'nextjs', 'typescript', 'ts'],
            'python': ['python', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
            'java': ['java', 'spring', 'maven', 'gradle'],
            'c#': ['c#', 'csharp', '.net', 'dotnet', 'asp.net'],
            'php': ['php', 'laravel', 'symfony'],
            'ruby': ['ruby', 'rails'],
            'html': ['html', 'html5'],
            'css': ['css', 'scss', 'sass', 'less', 'bootstrap', 'tailwind'],
            'go': ['go', 'golang'],
            'rust': ['rust'],
            'mobile': ['react native', 'flutter', 'android', 'ios', 'swift', 'kotlin'],
            'database': ['sql', 'mysql', 'postgresql', 'mongodb', 'database', 'firebase'],
            'devops': ['docker', 'kubernetes', 'aws', 'azure', 'ci/cd', 'jenkins']
        };
        
        const technologies = new Set();
        const content = (readme + ' ' + description).toLowerCase();
        
        Object.keys(techKeywords).forEach(tech => {
            const keywords = techKeywords[tech];
            for (let keyword of keywords) {
                if (content.includes(keyword)) {
                    technologies.add(tech);
                    break;
                }
            }
        });
        
        return Array.from(technologies);
    }

    // Function to get README content
    async function getReadmeContent(repo) {
        try {
            const response = await fetch(`https://api.github.com/repos/${username}/${repo}/readme`);
            if (!response.ok) return '';
            
            const data = await response.json();
            // Decode Base64 content
            return atob(data.content);
        } catch (error) {
            console.warn(`Could not get README for ${repo}:`, error);
            return '';
        }
    }

    // Function to get repositories
    async function fetchRepos() {
        try {
            loading.style.display = 'block';
            const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&direction=desc`);
            const repos = await response.json();
            
            // Filter repositories to exclude the GitHub Pages repository itself
            const filteredRepos = repos.filter(repo => {
                return !repo.fork && !repo.name.includes('.github.io');
            });
            
            // Process repositories for display
            const allTechnologies = new Set();
            const processedRepos = [];
            
            for (const repo of filteredRepos.slice(0, 12)) { // Limit to 12 most recent
                const readme = await getReadmeContent(repo.name);
                const technologies = detectTechnologies(readme, repo.description || '');
                
                // Add technologies to the global set
                technologies.forEach(tech => allTechnologies.add(tech));
                
                processedRepos.push({
                    name: repo.name,
                    description: repo.description || 'No description available',
                    homepage: repo.homepage,
                    html_url: repo.html_url,
                    technologies,
                    stars: repo.stargazers_count,
                    language: repo.language
                });
            }
            
            // Render technology filters
            renderTechFilters(Array.from(allTechnologies));
            
            // Render projects
            renderProjects(processedRepos);
            
            loading.style.display = 'none';
            
            // Setup filters
            setupFilters(processedRepos);
            
        } catch (error) {
            console.error("Error loading repositories:", error);
            loading.style.display = 'none';
            projectsContainer.innerHTML = `
                <div class="error-message">
                    <p>💔 An error occurred while loading projects.</p>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    }

    // Function to render technology filters
    function renderTechFilters(technologies) {
        technologies.sort();
        technologies.forEach(tech => {
            const button = document.createElement('button');
            button.classList.add('filter-btn');
            button.dataset.filter = tech;
            button.textContent = tech.charAt(0).toUpperCase() + tech.slice(1);
            techFilters.appendChild(button);
        });
    }

    // Function to render projects
    function renderProjects(repos) {
        projectsContainer.innerHTML = '';
        
        if (repos.length === 0) {
            projectsContainer.innerHTML = `
                <div class="no-projects">
                    <p>No projects found matching the filters.</p>
                </div>
            `;
            return;
        }
        
        repos.forEach(repo => {
            const projectCard = document.createElement('div');
            projectCard.classList.add('project-card');
            projectCard.dataset.technologies = repo.technologies.join(' ');
            
            projectCard.innerHTML = `
                <div class="project-content">
                    <h3 class="project-title">${repo.name}</h3>
                    <p class="project-description">${repo.description}</p>
                    
                    <div class="project-tech">
                        ${repo.technologies.map(tech => 
                            `<span class="tech-tag">${tech}</span>`
                        ).join('')}
                        ${repo.language ? `<span class="tech-tag">${repo.language}</span>` : ''}
                    </div>
                    
                    <div class="project-links">
                        <a href="${repo.html_url}" target="_blank">
                            <i class="fab fa-github"></i> Repository
                        </a>
                        ${repo.homepage ? 
                            `<a href="${repo.homepage}" target="_blank">
                                <i class="fas fa-external-link-alt"></i> Demo
                            </a>` : ''}
                    </div>
                </div>
            `;
            
            projectsContainer.appendChild(projectCard);
        });
    }

    // Function to setup filters
    function setupFilters(allRepos) {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter;
                
                // Update active class
                document.querySelector('.filter-btn.active').classList.remove('active');
                button.classList.add('active');
                
                // Filter projects
                if (filter === 'all') {
                    renderProjects(allRepos);
                } else {
                    const filteredRepos = allRepos.filter(repo => 
                        repo.technologies.includes(filter) || repo.language === filter
                    );
                    renderProjects(filteredRepos);
                }
            });
        });
    }

    // Start loading repositories
    fetchRepos();
});
