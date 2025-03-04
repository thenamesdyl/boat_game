import * as THREE from 'three';
import { gameUI } from './ui.js';
import { renderer } from '../core/gameState.js';

// Configuration flag - set to true to enable diagnostics
export const ENABLE_DIAGNOSTICS = true;

// Diagnostics state
let diagnosticsContainer = null;
let diagnosticsButton = null;
let isRunningTest = false;
let diagnosticsData = {
    webglInfo: null,
    performanceScore: 0,
    hardwareAcceleration: false,
    warnings: [],
    suggestions: []
};

// Initialize the diagnostics system
export function initDiagnostics() {
    // Only setup if enabled
    if (!ENABLE_DIAGNOSTICS) return;

    // Create diagnostics button
    createDiagnosticsButton();

    // Run initial basic checks
    runBasicChecks();

    console.log("GPU Diagnostics system initialized");
}

// Create the diagnostics toggle button
function createDiagnosticsButton() {
    diagnosticsButton = document.createElement('button');
    diagnosticsButton.id = 'diagnostics-button';
    diagnosticsButton.textContent = '🔍 Diagnostics';
    diagnosticsButton.style.position = 'fixed';
    diagnosticsButton.style.bottom = '10px';
    diagnosticsButton.style.right = '10px';
    diagnosticsButton.style.backgroundColor = 'rgba(0,0,0,0.7)';
    diagnosticsButton.style.color = 'white';
    diagnosticsButton.style.border = 'none';
    diagnosticsButton.style.borderRadius = '5px';
    diagnosticsButton.style.padding = '8px 12px';
    diagnosticsButton.style.fontFamily = 'Arial, sans-serif';
    diagnosticsButton.style.fontSize = '14px';
    diagnosticsButton.style.cursor = 'pointer';
    diagnosticsButton.style.zIndex = '999';
    diagnosticsButton.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    diagnosticsButton.onclick = toggleDiagnosticsPanel;
    document.body.appendChild(diagnosticsButton);
}

// Toggle the diagnostics panel visibility
function toggleDiagnosticsPanel() {
    if (diagnosticsContainer) {
        // If panel exists, remove it
        document.body.removeChild(diagnosticsContainer);
        diagnosticsContainer = null;
        diagnosticsButton.textContent = '🔍 Diagnostics';
    } else {
        // Create and show the panel
        createDiagnosticsPanel();

        // Run the diagnostics
        runDiagnostics();

        diagnosticsButton.textContent = '❌ Close';
    }
}

// Create the diagnostics panel UI
function createDiagnosticsPanel() {
    // Create container
    diagnosticsContainer = document.createElement('div');
    diagnosticsContainer.id = 'diagnostics-panel';
    diagnosticsContainer.style.position = 'fixed';
    diagnosticsContainer.style.top = '50%';
    diagnosticsContainer.style.left = '50%';
    diagnosticsContainer.style.transform = 'translate(-50%, -50%)';
    diagnosticsContainer.style.backgroundColor = 'rgba(0,0,0,0.9)';
    diagnosticsContainer.style.color = 'white';
    diagnosticsContainer.style.padding = '20px';
    diagnosticsContainer.style.borderRadius = '10px';
    diagnosticsContainer.style.zIndex = '1000';
    diagnosticsContainer.style.width = '500px';
    diagnosticsContainer.style.maxHeight = '80vh';
    diagnosticsContainer.style.overflowY = 'auto';
    diagnosticsContainer.style.overflowX = 'hidden';
    diagnosticsContainer.style.fontFamily = 'monospace';
    diagnosticsContainer.style.fontSize = '14px';
    diagnosticsContainer.style.boxShadow = '0 0 20px rgba(0,0,0,0.7)';

    // Add header
    const header = document.createElement('h2');
    header.textContent = 'GPU Diagnostics';
    header.style.textAlign = 'center';
    header.style.marginTop = '0';
    header.style.color = '#4fc3f7';
    header.style.borderBottom = '1px solid #4fc3f7';
    header.style.paddingBottom = '10px';
    diagnosticsContainer.appendChild(header);

    // Status message
    const statusMessage = document.createElement('div');
    statusMessage.id = 'diagnostics-status';
    statusMessage.textContent = 'Running diagnostics...';
    statusMessage.style.textAlign = 'center';
    statusMessage.style.margin = '10px 0';
    statusMessage.style.color = '#ffab40';
    diagnosticsContainer.appendChild(statusMessage);

    // Content sections
    const sections = [
        'system-info',
        'webgl-info',
        'performance-tests',
        'warnings',
        'suggestions'
    ];

    sections.forEach(id => {
        const section = document.createElement('div');
        section.id = `diagnostics-${id}`;
        section.style.margin = '15px 0';
        section.style.padding = '10px';
        section.style.backgroundColor = 'rgba(255,255,255,0.1)';
        section.style.borderRadius = '5px';
        section.style.border = '1px solid rgba(255,255,255,0.2)';

        const title = document.createElement('h3');
        title.textContent = id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '16px';
        title.style.color = '#81d4fa';
        section.appendChild(title);

        const content = document.createElement('div');
        content.id = `${id}-content`;
        content.style.fontSize = '12px';
        content.style.lineHeight = '1.4';
        section.appendChild(content);

        diagnosticsContainer.appendChild(section);
    });

    // Run test button
    const runButton = document.createElement('button');
    runButton.textContent = 'Run Advanced Tests';
    runButton.style.display = 'block';
    runButton.style.margin = '20px auto';
    runButton.style.padding = '10px 20px';
    runButton.style.backgroundColor = '#4caf50';
    runButton.style.color = 'white';
    runButton.style.border = 'none';
    runButton.style.borderRadius = '5px';
    runButton.style.cursor = 'pointer';
    runButton.style.fontWeight = 'bold';
    runButton.onclick = runAdvancedTests;
    diagnosticsContainer.appendChild(runButton);

    // "Send to Developer" button - simulates sending diagnostics data
    const shareButton = document.createElement('button');
    shareButton.textContent = 'Copy Report To Clipboard';
    shareButton.style.display = 'block';
    shareButton.style.margin = '10px auto';
    shareButton.style.padding = '10px 20px';
    shareButton.style.backgroundColor = '#2196f3';
    shareButton.style.color = 'white';
    shareButton.style.border = 'none';
    shareButton.style.borderRadius = '5px';
    shareButton.style.cursor = 'pointer';
    shareButton.onclick = () => {
        const report = generateDiagnosticsReport();
        navigator.clipboard.writeText(report)
            .then(() => {
                shareButton.textContent = 'Copied!';
                setTimeout(() => {
                    shareButton.textContent = 'Copy Report To Clipboard';
                }, 2000);
            })
            .catch(err => {
                shareButton.textContent = 'Failed to copy';
                console.error('Failed to copy report:', err);
            });
    };
    diagnosticsContainer.appendChild(shareButton);

    document.body.appendChild(diagnosticsContainer);
}

// Generate a plain text report of all diagnostics data
function generateDiagnosticsReport() {
    const { webglInfo, performanceScore, hardwareAcceleration, warnings, suggestions } = diagnosticsData;

    let report = '=== GPU DIAGNOSTICS REPORT ===\n\n';

    // System info
    report += '== SYSTEM INFORMATION ==\n';
    report += `Browser: ${navigator.userAgent}\n`;
    report += `Window size: ${window.innerWidth}×${window.innerHeight}\n`;
    report += `Device pixel ratio: ${window.devicePixelRatio}\n`;
    report += `Memory: ${performance.memory ?
        Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB / ' +
        Math.round(performance.memory.jsHeapSizeLimit / 1048576) + 'MB' :
        'Not available'}\n\n`;

    // WebGL info
    if (webglInfo) {
        report += '== WEBGL INFORMATION ==\n';
        report += `Vendor: ${webglInfo.vendor}\n`;
        report += `Renderer: ${webglInfo.renderer}\n`;
        report += `WebGL version: ${webglInfo.version}\n`;
        report += `Shader version: ${webglInfo.shaderVersion}\n`;
        report += `Max texture size: ${webglInfo.maxTextureSize}\n`;
        report += `Hardware acceleration: ${hardwareAcceleration ? 'Yes' : 'No'}\n`;
        report += `Extensions available: ${webglInfo.extensionsCount}\n\n`;
    }

    // Performance
    report += '== PERFORMANCE ==\n';
    report += `Performance score: ${performanceScore}/100\n\n`;

    // Warnings
    if (warnings.length > 0) {
        report += '== WARNINGS ==\n';
        warnings.forEach((warning, i) => {
            report += `${i + 1}. ${warning}\n`;
        });
        report += '\n';
    }

    // Suggestions
    if (suggestions.length > 0) {
        report += '== SUGGESTIONS ==\n';
        suggestions.forEach((suggestion, i) => {
            report += `${i + 1}. ${suggestion}\n`;
        });
    }

    return report;
}

// Run all diagnostic tests
function runDiagnostics() {
    const statusElement = document.getElementById('diagnostics-status');
    statusElement.textContent = 'Running diagnostics...';

    // Fill in system info
    fillSystemInfo();

    // Get WebGL info
    getWebGLInfo();

    // Check for hardware acceleration
    checkHardwareAcceleration();

    // Update status
    statusElement.textContent = 'Basic diagnostics complete';
}

// Fill in the system information section
function fillSystemInfo() {
    const content = document.getElementById('system-info-content');
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
            <div style="color: #aaa;">Browser:</div>
            <div>${getBrowserInfo()}</div>
            
            <div style="color: #aaa;">Window Size:</div>
            <div>${window.innerWidth} × ${window.innerHeight}</div>
            
            <div style="color: #aaa;">Device Pixel Ratio:</div>
            <div>${window.devicePixelRatio}</div>
            
            <div style="color: #aaa;">Memory:</div>
            <div>${getMemoryInfo()}</div>
            
            <div style="color: #aaa;">FPS:</div>
            <div>${gameUI.currentFps || 'N/A'}</div>
            
            <div style="color: #aaa;">Operating System:</div>
            <div>${getOSInfo()}</div>
        </div>
    `;
}

// Get browser information with detection for Brave
function getBrowserInfo() {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Brave')) {
        return 'Brave';
    } else if (userAgent.includes('Chrome')) {
        return 'Chrome';
    } else if (userAgent.includes('Firefox')) {
        return 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        return 'Safari';
    } else if (userAgent.includes('Edge')) {
        return 'Edge';
    } else {
        return 'Unknown';
    }
}

// Get memory information if available
function getMemoryInfo() {
    if (performance.memory) {
        const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        const totalMB = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
        return `${usedMB}MB / ${totalMB}MB`;
    }
    return 'Not available';
}

// Get operating system information
function getOSInfo() {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Windows')) {
        return 'Windows';
    } else if (userAgent.includes('Mac OS')) {
        return 'macOS';
    } else if (userAgent.includes('Linux')) {
        return 'Linux';
    } else if (userAgent.includes('Android')) {
        return 'Android';
    } else if (userAgent.includes('iOS')) {
        return 'iOS';
    } else {
        return 'Unknown';
    }
}

// Get WebGL information
function getWebGLInfo() {
    const content = document.getElementById('webgl-info-content');

    // Get WebGL context from existing renderer
    const gl = renderer.getContext();

    if (!gl) {
        content.innerHTML = '<div style="color: #ff5252;">WebGL not available</div>';
        diagnosticsData.warnings.push('WebGL is not available in your browser.');
        diagnosticsData.suggestions.push('Try enabling hardware acceleration in your browser settings.');
        updateWarningsAndSuggestions();
        return;
    }

    // Get debug info extension
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';

    // Check if it's likely a software renderer
    const isSoftwareRenderer =
        renderer.includes('SwiftShader') ||
        renderer.includes('ANGLE') ||
        renderer.includes('llvmpipe') ||
        renderer.includes('Software') ||
        renderer.includes('Mesa') ||
        vendor.includes('Google');

    // Store WebGL info
    diagnosticsData.webglInfo = {
        vendor,
        renderer,
        version: gl.getParameter(gl.VERSION),
        shaderVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        extensions: gl.getSupportedExtensions(),
        extensionsCount: gl.getSupportedExtensions().length
    };

    // Display the WebGL info
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
            <div style="color: #aaa;">Vendor:</div>
            <div>${diagnosticsData.webglInfo.vendor}</div>
            
            <div style="color: #aaa;">Renderer:</div>
            <div style="${isSoftwareRenderer ? 'color: #ff5252;' : ''}">${diagnosticsData.webglInfo.renderer}</div>
            
            <div style="color: #aaa;">WebGL Version:</div>
            <div>${diagnosticsData.webglInfo.version}</div>
            
            <div style="color: #aaa;">Shader Version:</div>
            <div>${diagnosticsData.webglInfo.shaderVersion}</div>
            
            <div style="color: #aaa;">Max Texture Size:</div>
            <div>${diagnosticsData.webglInfo.maxTextureSize}</div>
            
            <div style="color: #aaa;">Max Render Buffer Size:</div>
            <div>${diagnosticsData.webglInfo.maxRenderBufferSize}</div>
            
            <div style="color: #aaa;">Hardware Acceleration:</div>
            <div>${diagnosticsData.hardwareAcceleration ? '<span style="color: #4caf50;">Enabled</span>' : '<span style="color: #f44336;">Disabled</span>'}</div>
            
            <div style="color: #aaa;">Extensions:</div>
            <div>${diagnosticsData.webglInfo.extensionsCount} available</div>
        </div>
    `;

    // Add warnings if this appears to be a software renderer
    if (isSoftwareRenderer) {
        diagnosticsData.warnings.push(
            'Your browser appears to be using a software renderer, which will significantly reduce performance.'
        );
        diagnosticsData.suggestions.push(
            'For Brave browser, go to brave://settings/system and enable "Use hardware acceleration when available".'
        );
        diagnosticsData.suggestions.push(
            'After changing hardware acceleration settings, restart your browser completely.'
        );
        updateWarningsAndSuggestions();
    }
}

// Check if hardware acceleration is likely enabled
function checkHardwareAcceleration() {
    if (!diagnosticsData.webglInfo) return false;

    // Canvas approach
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
        diagnosticsData.hardwareAcceleration = false;
        return;
    }

    // Check for key WebGL extensions that suggest hardware acceleration
    const extensions = [
        'WEBGL_depth_texture',
        'OES_texture_float',
        'OES_texture_half_float',
        'OES_standard_derivatives'
    ];

    let supportedExtensions = 0;
    for (const ext of extensions) {
        if (gl.getExtension(ext)) {
            supportedExtensions++;
        }
    }

    // If most of the extensions are supported, hardware acceleration is likely enabled
    diagnosticsData.hardwareAcceleration = supportedExtensions >= 3;

    // If renderer suggests software rendering, then override
    if (diagnosticsData.webglInfo.renderer.includes('SwiftShader') ||
        diagnosticsData.webglInfo.renderer.includes('ANGLE') ||
        diagnosticsData.webglInfo.renderer.includes('llvmpipe') ||
        diagnosticsData.webglInfo.renderer.includes('Software')) {
        diagnosticsData.hardwareAcceleration = false;
    }

    return diagnosticsData.hardwareAcceleration;
}

// Run advanced diagnostics tests
function runAdvancedTests() {
    if (isRunningTest) {
        return;
    }

    isRunningTest = true;
    const statusElement = document.getElementById('diagnostics-status');
    statusElement.textContent = 'Running advanced tests...';

    // Set up performance test area
    const performanceContent = document.getElementById('performance-tests-content');
    performanceContent.innerHTML = `
        <div id="test-progress" style="margin-bottom: 10px;">
            <div style="width: 100%; height: 20px; background-color: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden;">
                <div id="test-progress-bar" style="width: 0%; height: 100%; background-color: #4caf50; transition: width 0.3s;"></div>
            </div>
            <div id="test-status" style="text-align: center; margin-top: 5px;">Preparing tests...</div>
        </div>
        <div id="test-results" style="display: none;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <div style="color: #aaa;">Draw calls per second:</div>
                <div id="draw-calls-result">0</div>
                
                <div style="color: #aaa;">Triangle throughput:</div>
                <div id="triangle-result">0</div>
                
                <div style="color: #aaa;">Texture fill rate:</div>
                <div id="texture-result">0</div>
                
                <div style="color: #aaa;">Shader complexity:</div>
                <div id="shader-result">0</div>
                
                <div style="color: #aaa;">Overall score:</div>
                <div id="overall-score" style="font-weight: bold;">0/100</div>
            </div>
        </div>
    `;

    // Run tests in sequence
    setTimeout(() => runDrawCallTest(), 100);
}

// Run test for draw call performance
function runDrawCallTest() {
    updateTestProgress(0, 'Testing draw call performance...');

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const gl = canvas.getContext('webgl');
    if (!gl) {
        failTest('WebGL not available');
        return;
    }

    // Create a simple shader program
    const program = createSimpleProgram(gl);
    gl.useProgram(program);

    // Create geometry
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Measure draw calls
    const startTime = performance.now();
    let drawCalls = 0;

    function runTest() {
        if (performance.now() - startTime < 1000) {
            // Do 100 draw calls per frame for efficiency
            for (let i = 0; i < 100; i++) {
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                drawCalls++;
            }
            requestAnimationFrame(runTest);
        } else {
            // Test complete
            const drawCallsPerSecond = drawCalls;
            document.getElementById('draw-calls-result').textContent = drawCallsPerSecond.toLocaleString();

            // Calculate score (max score is around 100k draw calls/sec on high-end GPU)
            const drawCallScore = Math.min(100, drawCallsPerSecond / 1000);

            // Cleanup
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);

            // Next test
            updateTestProgress(25, 'Testing triangle throughput...');
            setTimeout(() => runTriangleTest(), 100);
        }
    }

    runTest();
}

// Run test for triangle throughput
function runTriangleTest() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const gl = canvas.getContext('webgl');
    if (!gl) {
        failTest('WebGL not available');
        return;
    }

    // Create a simple shader program
    const program = createSimpleProgram(gl);
    gl.useProgram(program);

    // Create triangle mesh with lots of triangles
    const triangleCount = 10000;
    const vertices = new Float32Array(triangleCount * 6); // 3 points per triangle, 2 coords per point

    for (let i = 0; i < triangleCount; i++) {
        const baseIndex = i * 6;
        vertices[baseIndex] = Math.random() * 2 - 1;
        vertices[baseIndex + 1] = Math.random() * 2 - 1;
        vertices[baseIndex + 2] = Math.random() * 2 - 1;
        vertices[baseIndex + 3] = Math.random() * 2 - 1;
        vertices[baseIndex + 4] = Math.random() * 2 - 1;
        vertices[baseIndex + 5] = Math.random() * 2 - 1;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Measure triangle throughput
    const startTime = performance.now();
    let frames = 0;

    function runTest() {
        if (performance.now() - startTime < 1000) {
            gl.drawArrays(gl.TRIANGLES, 0, triangleCount * 3);
            frames++;
            requestAnimationFrame(runTest);
        } else {
            // Test complete
            const trianglesPerSecond = frames * triangleCount;
            document.getElementById('triangle-result').textContent = trianglesPerSecond.toLocaleString() + ' triangles/sec';

            // Calculate score (max score at around 100M triangles/sec)
            const triangleScore = Math.min(100, trianglesPerSecond / 1000000);

            // Cleanup
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);

            // Next test
            updateTestProgress(50, 'Testing texture fill rate...');
            setTimeout(() => runTextureTest(), 100);
        }
    }

    runTest();
}

// Run test for texture fill rate
function runTextureTest() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;

    const gl = canvas.getContext('webgl');
    if (!gl) {
        failTest('WebGL not available');
        return;
    }

    // Create a textured shader program
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, `
        attribute vec2 position;
        varying vec2 texCoord;
        void main() {
            texCoord = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, `
        precision mediump float;
        varying vec2 texCoord;
        uniform sampler2D texture;
        void main() {
            gl_FragColor = texture2D(texture, texCoord);
        }
    `);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Create a test texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Fill with random data
    const texData = new Uint8Array(1024 * 1024 * 4);
    for (let i = 0; i < texData.length; i++) {
        texData[i] = Math.random() * 255;
    }

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, texData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Set up geometry
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Measure fill rate
    const startTime = performance.now();
    let frames = 0;

    function runTest() {
        if (performance.now() - startTime < 1000) {
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            frames++;
            requestAnimationFrame(runTest);
        } else {
            // Test complete
            const pixelsPerSecond = frames * 1024 * 1024;
            const megapixelsPerSecond = pixelsPerSecond / 1000000;
            document.getElementById('texture-result').textContent = megapixelsPerSecond.toFixed(2) + ' Mpixels/sec';

            // Calculate score (max score at around 10000 Mpixels/sec)
            const textureScore = Math.min(100, megapixelsPerSecond / 100);

            // Cleanup
            gl.deleteTexture(texture);
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);

            // Next test
            updateTestProgress(75, 'Testing shader complexity...');
            setTimeout(() => runShaderTest(), 100);
        }
    }

    runTest();
}

// Run test for shader performance
function runShaderTest() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const gl = canvas.getContext('webgl');
    if (!gl) {
        failTest('WebGL not available');
        return;
    }

    // Create a complex shader program
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, `
        attribute vec2 position;
        varying vec2 texCoord;
        void main() {
            texCoord = position * 0.5 + 0.5;
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `);
    gl.compileShader(vertexShader);

    // Complex fragment shader with noise and patterns
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, `
        precision mediump float;
        varying vec2 texCoord;
        uniform float time;
        
        // Simplex noise functions
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy));
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                  + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                                dot(x12.zw,x12.zw)), 0.0);
            m = m*m;
            m = m*m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }
        
        void main() {
            vec2 uv = texCoord;
            
            // Create several noise layers at different scales
            float n1 = snoise(uv * 5.0 + time * 0.1) * 0.5 + 0.5;
            float n2 = snoise(uv * 10.0 - time * 0.2) * 0.5 + 0.5;
            float n3 = snoise(uv * 20.0 + time * 0.3) * 0.5 + 0.5;
            
            // Create patterns
            float circle = length(uv - 0.5) * 2.0;
            float pattern1 = sin(uv.x * 50.0) * sin(uv.y * 50.0);
            float pattern2 = sin(uv.x * 30.0 + time) * sin(uv.y * 30.0 + time);
            
            // Mix everything
            float mix1 = mix(n1, n2, n3);
            float mix2 = mix(pattern1, pattern2, circle);
            float final = mix(mix1, mix2, sin(time) * 0.5 + 0.5);
            
            // Create color
            vec3 color = vec3(
                sin(final * 3.14159 + time) * 0.5 + 0.5,
                sin(final * 3.14159 + time + 2.094) * 0.5 + 0.5,
                sin(final * 3.14159 + time + 4.188) * 0.5 + 0.5
            );
            
            gl_FragColor = vec4(color, 1.0);
        }
    `);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Set up geometry
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Time uniform
    const timeLocation = gl.getUniformLocation(program, "time");

    // Measure shader performance
    const startTime = performance.now();
    let frames = 0;

    function runTest() {
        if (performance.now() - startTime < 1000) {
            gl.uniform1f(timeLocation, performance.now() / 1000.0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            frames++;
            requestAnimationFrame(runTest);
        } else {
            // Test complete
            document.getElementById('shader-result').textContent = frames + ' frames/sec';

            // Calculate score (max score at around 60fps)
            const shaderScore = Math.min(100, frames / 0.6);

            // Calculate overall score (weighted average)
            const drawCallScore = parseInt(document.getElementById('draw-calls-result').textContent.replace(/,/g, '')) / 1000; // Score based on draw calls
            const triangleScore = parseInt(document.getElementById('triangle-result').textContent.match(/\d+/)[0]) / 1000000; // Score based on triangles
            const textureScore = parseFloat(document.getElementById('texture-result').textContent.match(/[\d.]+/)[0]) / 100; // Score based on Mpixels

            // Weighted average (highest weight to most important metrics)
            let overallScore = (
                drawCallScore * 0.3 +
                triangleScore * 0.2 +
                textureScore * 0.2 +
                shaderScore * 0.3
            );

            // Boost score if hardware acceleration is detected
            if (diagnosticsData.hardwareAcceleration) {
                overallScore *= 1.2;
            }

            // Normalize to 0-100
            overallScore = Math.min(100, Math.round(overallScore));
            diagnosticsData.performanceScore = overallScore;

            // Update UI
            document.getElementById('overall-score').textContent = `${overallScore}/100`;
            document.getElementById('test-results').style.display = 'block';

            // Set color based on score
            const scoreElement = document.getElementById('overall-score');
            if (overallScore < 30) {
                scoreElement.style.color = '#f44336'; // Red for poor performance
                addWarning('Your GPU performance is below recommended. Consider lowering graphics settings.');
                addSuggestion('Try lowering resolution, disabling post-processing effects, or reducing draw distance.');
            } else if (overallScore < 70) {
                scoreElement.style.color = '#ffeb3b'; // Yellow for moderate performance
                addWarning('Your GPU performance is adequate but not optimal.');
                addSuggestion('Some graphics settings might need adjustment for smooth gameplay.');
            } else {
                scoreElement.style.color = '#4caf50'; // Green for good performance
            }

            // Cleanup
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);

            updateTestProgress(100, 'All tests complete!');
            isRunningTest = false;
        }
    }

    runTest();
}

// Update test progress bar
function updateTestProgress(percent, statusText) {
    document.getElementById('test-progress-bar').style.width = `${percent}%`;
    document.getElementById('test-status').textContent = statusText;
}

// Handle test failure
function failTest(message) {
    document.getElementById('test-status').textContent = `Test failed: ${message}`;
    document.getElementById('test-progress-bar').style.backgroundColor = '#f44336';
    isRunningTest = false;
}

// Create a simple shader program for testing
function createSimpleProgram(gl) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, `
        attribute vec2 position;
        void main() {
            gl_Position = vec4(position, 0.0, 1.0);
        }
    `);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, `
        precision mediump float;
        void main() {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
    `);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    return program;
}

// Add a warning to the diagnostics data
function addWarning(message) {
    if (!diagnosticsData.warnings.includes(message)) {
        diagnosticsData.warnings.push(message);
        updateWarningsAndSuggestions();
    }
}

// Add a suggestion to the diagnostics data
function addSuggestion(message) {
    if (!diagnosticsData.suggestions.includes(message)) {
        diagnosticsData.suggestions.push(message);
        updateWarningsAndSuggestions();
    }
}

// Update the warnings and suggestions UI
function updateWarningsAndSuggestions() {
    // Update warnings section
    const warningsContent = document.getElementById('warnings-content');
    if (warningsContent) {
        if (diagnosticsData.warnings.length > 0) {
            warningsContent.innerHTML = '<ul style="color: #ff5252;">' +
                diagnosticsData.warnings.map(warning => `<li>${warning}</li>`).join('') +
                '</ul>';
        } else {
            warningsContent.innerHTML = '<p>No warnings detected.</p>';
        }
    }

    // Update suggestions section
    const suggestionsContent = document.getElementById('suggestions-content');
    if (suggestionsContent) {
        if (diagnosticsData.suggestions.length > 0) {
            suggestionsContent.innerHTML = '<ul style="color: #4fc3f7;">' +
                diagnosticsData.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('') +
                '</ul>';
        } else {
            suggestionsContent.innerHTML = '<p>No suggestions available.</p>';
        }
    }
}

// Check if we're likely using a software renderer
function isSoftwareRendererCheck(renderer) {
    return renderer.includes('SwiftShader') ||
        renderer.includes('ANGLE') ||
        renderer.includes('llvmpipe') ||
        renderer.includes('Software') ||
        renderer.includes('Microsoft Basic Render');
}

// Detect if we're in Brave browser
export function isBraveBrowser() {
    // Try to use the brave property if available
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
        return navigator.brave.isBrave();
    }

    // Fallback detection
    return navigator.userAgent.includes('Brave') ||
        (window.navigator.plugins.length === 0 && navigator.userAgent.includes('Chrome'));
}

// Get diagnostics data as a simple object for game state
export function getDiagnosticsData() {
    return {
        ...diagnosticsData,
        isBrave: isBraveBrowser()
    };
}

// Export this function for UI.js to display diagnostics info
export function updateDiagnosticsDisplay(fps) {
    if (!ENABLE_DIAGNOSTICS || !diagnosticsData.performanceScore) return;

    // Update FPS warning threshold based on performance score
    if (fps < 30 && diagnosticsData.performanceScore > 50) {
        // FPS is low despite decent hardware, might be a browser/driver/OS issue
        if (!diagnosticsData.warnings.some(w => w.includes('FPS is lower than expected'))) {
            addWarning('FPS is lower than expected for your hardware capabilities.');
            if (isBraveBrowser()) {
                addSuggestion('You are using Brave browser. Some Brave settings may affect game performance. Try enabling hardware acceleration.');
            }
        }
    }
}

// Add a method to check if diagnostics is showing reduced performance for browser reasons
export function isLikelyBrowserPerformanceIssue() {
    if (!diagnosticsData.webglInfo) return false;

    // Check if we have good hardware but poor web performance
    const hasGoodHardware = !isSoftwareRendererCheck(diagnosticsData.webglInfo.renderer) &&
        !diagnosticsData.webglInfo.renderer.includes('Intel');

    const hasPoorPerformance = diagnosticsData.performanceScore < 50;

    return hasGoodHardware && hasPoorPerformance;
}

// Add a method to get hardware-appropriate graphics settings
export function getRecommendedGraphicsSettings() {
    if (!diagnosticsData.performanceScore) {
        // Default to medium if we don't have a score yet
        return 'medium';
    }

    if (diagnosticsData.performanceScore < 30) {
        return 'low';
    } else if (diagnosticsData.performanceScore < 70) {
        return 'medium';
    } else {
        return 'high';
    }
}

// Add this after getWebGLInfo() function
function updateWebGLInfoUI() {
    // Only update if we have WebGL info and the panel exists
    if (!diagnosticsData.webglInfo || !document.getElementById('webgl-info-content')) return;

    const info = diagnosticsData.webglInfo;
    const content = document.getElementById('webgl-info-content');

    // Build HTML content
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div>Vendor:</div>
            <div>${info.vendor}</div>
            
            <div>Renderer:</div>
            <div>${info.renderer}</div>
            
            <div>WebGL Version:</div>
            <div>${info.version}</div>
            
            <div>Shader Version:</div>
            <div>${info.shaderVersion}</div>
            
            <div>Max Texture Size:</div>
            <div>${info.maxTextureSize}px</div>
            
            <div>Max Render Buffer Size:</div>
            <div>${info.maxRenderBufferSize}px</div>
            
            <div>Hardware Acceleration:</div>
            <div>${diagnosticsData.hardwareAcceleration ? '<span style="color: #4caf50;">Enabled</span>' : '<span style="color: #f44336;">Disabled</span>'}</div>
            
            <div>Extensions Available:</div>
            <div>${info.extensionsCount}</div>
        </div>
        
        <div style="margin-top: 10px;">
            <details>
                <summary>View All Extensions</summary>
                <div style="font-size: 10px; max-height: 100px; overflow-y: auto; margin-top: 5px;">
                    ${info.extensions.join('<br>')}
                </div>
            </details>
        </div>
    `;
}

// Modify the runBasicChecks function to update UI
function runBasicChecks() {
    // Fill system info first
    fillSystemInfo();

    // Get WebGL info
    getWebGLInfo();

    // Update WebGL info in UI
    updateWebGLInfoUI();

    // Check for hardware acceleration
    checkHardwareAcceleration();

    // Check for common issues
    checkForCommonIssues();

    // Update warnings and suggestions
    updateWarningsAndSuggestions();
}

// Modify the runDiagnostics function to ensure the UI is initialized before starting tests
function runDiagnostics() {
    const statusElement = document.getElementById('diagnostics-status');
    statusElement.textContent = 'Running diagnostics...';

    // Fill in system info
    fillSystemInfo();

    // Get WebGL info
    getWebGLInfo();

    // Check for hardware acceleration
    checkHardwareAcceleration();

    // Prepare performance tests UI
    updatePerformanceTestsUI(false);

    // Check for common issues
    checkForCommonIssues();

    // Update warnings and suggestions
    updateWarningsAndSuggestions();

    // Update status
    statusElement.textContent = 'Basic diagnostics complete. Run advanced tests for more information.';
}

// Update the getWebGLInfo function to call updateWebGLInfoUI
function getWebGLInfo() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) {
            addWarning('WebGL is not supported by your browser or hardware');
            return;
        }

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

        // Check for likely software rendering
        if (isSoftwareRendererCheck(renderer)) {
            diagnosticsData.hardwareAcceleration = false;
            addWarning('Hardware acceleration appears to be disabled. GPU features will be limited.');
            addSuggestion('Enable hardware acceleration in your browser settings for better performance.');
        } else {
            diagnosticsData.hardwareAcceleration = true;
        }

        // Store WebGL information
        const extensions = gl.getSupportedExtensions();
        diagnosticsData.webglInfo = {
            vendor,
            renderer,
            version: gl.getParameter(gl.VERSION),
            shaderVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            extensions,
            extensionsCount: extensions.length
        };

        // Update UI with WebGL info
        updateWebGLInfoUI();

    } catch (error) {
        console.error('Error getting WebGL info:', error);
        addWarning('Failed to get WebGL information: ' + error.message);
    }
}

// Add this after runDiagnostics function
function updatePerformanceTestsUI(testsStarted = false) {
    const content = document.getElementById('performance-tests-content');
    if (!content) return;

    if (!testsStarted) {
        content.innerHTML = `
            <div id="test-progress" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span id="test-status">Click "Run Advanced Tests" to begin</span>
                    <span>0%</span>
                </div>
                <div style="background-color: rgba(255,255,255,0.1); height: 10px; border-radius: 5px; overflow: hidden;">
                    <div id="test-progress-bar" style="background-color: #4fc3f7; height: 100%; width: 0%; transition: width 0.3s;"></div>
                </div>
            </div>
            
            <div id="test-results" style="display: none; margin-top: 15px;">
                <h4 style="margin: 5px 0; color: #81d4fa;">Test Results</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin: 10px 0;">
                    <div>Draw Calls:</div>
                    <div id="draw-calls-result">Testing...</div>
                    
                    <div>Triangle Throughput:</div>
                    <div id="triangle-result">Testing...</div>
                    
                    <div>Texture Fill Rate:</div>
                    <div id="texture-result">Testing...</div>
                    
                    <div>Shader Complexity:</div>
                    <div id="shader-result">Testing...</div>
                </div>
                
                <div style="margin-top: 15px; text-align: center;">
                    <div style="font-size: 12px; margin-bottom: 5px;">Overall Performance Score:</div>
                    <div id="overall-score" style="font-size: 20px; font-weight: bold;">--/100</div>
                </div>
            </div>
        `;
    }
}

// Update the fillSystemInfo function to actually update the UI
function fillSystemInfo() {
    try {
        const systemInfoContent = document.getElementById('system-info-content');
        if (!systemInfoContent) return;

        // Get memory info safely
        let memoryInfo = 'Not available';
        if (performance && performance.memory) {
            const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
            const totalMB = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
            memoryInfo = `${usedMB}MB / ${totalMB}MB`;
        }

        // Get FPS info
        const fpsElement = document.getElementById('fps-counter');
        const fps = fpsElement ? fpsElement.textContent.replace('FPS: ', '') : 'Unknown';

        // Get OS info
        const platform = navigator.platform;
        const isWindows = platform.indexOf('Win') > -1;
        const isMac = platform.indexOf('Mac') > -1;
        const isLinux = platform.indexOf('Linux') > -1;

        let osName = 'Unknown';
        if (isWindows) osName = 'Windows';
        else if (isMac) osName = 'macOS';
        else if (isLinux) osName = 'Linux';

        // Update the UI
        systemInfoContent.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>Browser:</div>
                <div>${navigator.userAgent.split(' ').slice(-1)[0].split('/')[0]}</div>
                
                <div>Window Size:</div>
                <div>${window.innerWidth} × ${window.innerHeight}</div>
                
                <div>Device Pixel Ratio:</div>
                <div>${window.devicePixelRatio}</div>
                
                <div>Memory:</div>
                <div>${memoryInfo}</div>
                
                <div>FPS:</div>
                <div>${fps}</div>
                
                <div>Operating System:</div>
                <div>${osName}</div>
            </div>
        `;

    } catch (error) {
        console.error('Error filling system info:', error);
    }
}