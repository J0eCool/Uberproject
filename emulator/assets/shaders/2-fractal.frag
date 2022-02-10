#version 330
precision mediump float;

uniform float uTime;

in vec2 vPos;

layout (location = 0) out vec4 FragColor;

const float PI = 3.14159265;

vec3 render(vec2 uv, float param = 1.0) {
    float b = 0.25*pow(1-uv.x,2);
    vec3 color = uv.x*vec3(uv.x, 1-b, 1-b);
    vec3 lineColor = vec3(pow(1-uv.x,2)*0.5, 0, 0);

    float drawStop = 1.0;
    float xLineWidth = 0.005*drawStop;
    float yLineWidth = 0.005*drawStop;

    const int maxDepth = 32;
    const float zoom = 1.25;
    float curZoom = zoom;
    for (int i = 0; i < maxDepth && uv.x < drawStop; ++i) {
        if (abs(drawStop-uv.x) < xLineWidth) {
            color = lineColor;
            break;
        }
        uv.x *= zoom;
        // xLineWidth*=zoom;

        float f = log(abs(uv.y))/log(zoom);
        // f = pow(zoom, uv.y);
        // f = pow(zoom, uv.y*param);
        f = abs(uv.y);
        if (abs(f - uv.x) < yLineWidth) {
            color = lineColor;
            break;
        }
        uv.y += uv.y;
        yLineWidth *= zoom;

        curZoom *= zoom;
    }

    return color;
}

void main() {
    vec2 uv = (vPos + 1) / 2;
    uv.x = 1 - uv.x;
    // uv.y -= 0.5;
    // uv.y = uv.y - fract(uTime);
    // uv = mix(uv, uv/4+vec2(0.75,0.0), pow(fract(uTime*0.4),1/sqrt(2)));
    
    float t = fract(uTime/2);
    vec2 arrowOfTime = vec2(0, t);

    vec3 sceneA = 1-render(uv - arrowOfTime, 1);
    vec3 sceneB = render(uv + arrowOfTime, 1);
    vec3 sceneC = render(uv);
    vec3 sceneD = mix(sceneA, sceneC, t);

    vec3 color = sceneD;
    FragColor = vec4(color, 1);
}
