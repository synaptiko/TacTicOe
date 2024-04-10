// Copy of Three.js's standard fragment shader
// Result of console.log(parameters.fragmentShader);
// Our adjustments demarcated with <TacTicOe> comments

#define STANDARD

// <TacTicOe>
varying vec2 vMyUv;
varying vec3 vMyNormal;
uniform vec4 uEdges;
uniform int uPlayer;
uniform float uPlayerFill;
uniform vec3 uStrokeColor;
uniform float uEdgeThickness;
uniform float uEdgeSmoothness;
uniform float uSymbolThickness;
uniform float uSymbolSmoothness;
uniform float uSymbolGap;
uniform float uSymbolRadius;
uniform float uXSymbolScale;
// </TacTicOe>

#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

// <TacTicOe>
// SDFs from https://iquilezles.org/articles/distfunctions2d/
float sdArc(in vec2 p, in vec2 sc, in float ra, float rb) {
  p.x = abs(p.x);

  return ((sc.y * p.x > sc.x * p.y) ? length(p - sc * ra) : abs(length(p) - ra)) - rb;
}

float sdSegment(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);

    return length(pa - ba * h);
}
// </TacTicOe>

// <TacTicOe>
vec3 upVector = vec3(0.0, 0.0, 1.0);

vec2 rotate(vec2 point, vec2 center, float angle) {
  float cosTheta = cos(angle);
  float sinTheta = sin(angle);
  float x = point.x - center.x;
  float y = point.y - center.y;

  return vec2(
    x * cosTheta - y * sinTheta,
    x * sinTheta + y * cosTheta
  ) + center;
}

vec2 flipX(vec2 uv) {
  return vec2(1.0 - uv.x, uv.y);
}

vec2 flipXY(vec2 uv) {
  return vec2(1.0 - uv.x, 1.0 - uv.y);
}

float drawArc(vec2 position, vec2 center, float radius, float angle, float thickness, float smoothness) {
  vec2  sc = vec2(sin(angle),cos(angle));
  float d = sdArc(rotate(position, center, angle) - center, sc, radius, thickness * 0.5);

  return smoothstep(smoothness, 0.0, d);
}

float drawCircle(vec2 position, vec2 center, float radius, float thickness, float smoothness) {
  float d = abs(length(position - center) - radius);

  return smoothstep(thickness * 0.5 + smoothness, thickness * 0.5, d);
}

float drawLine(vec2 position, vec2 a, vec2 b, float thickness, float smoothness) {
  float d = sdSegment(position, a, b);

  return smoothstep(thickness * 0.5 + smoothness, thickness * 0.5, d);
}

float drawHalfCrossSegment(vec2 position, vec2 a, vec2 b, float length, float thickness, float smoothness) {
  if (length >= 1.0) {
    return drawLine(position, a, b, thickness, smoothness);
  } else if (length <= 0.0) {
    return 0.0;
  }

  // calculate b based on length as relative distance from a; length = <0, 1>
  vec2 ab = b - a;
  b = a + ab * length;

  return drawLine(position, a, b, thickness, smoothness);
}

// w = width of central square ("thickness of the leg")
// h = height of leg from central square
float drawHalfCross(vec2 position, float w, float h, vec2 center, float thickness, float smoothness) {
  float wh = w * 0.5;
  vec2 points[7];

  points[0] = vec2(-wh, wh + h);
  points[1] = vec2(wh, wh + h);
  points[2] = vec2(wh, wh);
  points[3] = vec2(wh + h, wh);
  points[4] = vec2(wh + h, -wh);
  points[5] = vec2(wh, -wh);
  points[6] = vec2(wh, -wh - h);

  float totalLength = 0.0;

  for (int i = 1; i < 7; i++) {
    totalLength += length(points[i] - points[i - 1]);
  }

  float scaledFill = uPlayerFill * totalLength;
  float cumulativeLength = 0.0;
  float alpha = 0.0;

  for (int i = 1; i < 7; i++) {
    float segmentLength = length(points[i] - points[i - 1]);

    if (scaledFill <= cumulativeLength) {
      break;
    }

    float visibleFraction = min((scaledFill - cumulativeLength) / segmentLength, 1.0);
    vec2 start = center + points[i - 1];
    vec2 end = center + points[i];
    float segment = drawHalfCrossSegment(position, start, end, visibleFraction, thickness, smoothness);
    alpha = max(alpha, segment);

    cumulativeLength += segmentLength;
  }

  return alpha;
}

float drawQuarterCross(vec2 position, float w, float h, vec2 center, float thickness, float smoothness) {
  float wh = w * 0.5;
  float line1 = drawLine(position, center + vec2(wh, wh), center + vec2(wh, wh + h), thickness, smoothness);
  float line2 = drawLine(position, center + vec2(wh, wh + h), center + vec2(-wh, wh + h), thickness, smoothness);
  float line3 = drawLine(position, center + vec2(-wh, wh + h), center + vec2(-wh, wh), thickness, smoothness);

  return max(max(line1, line2), line3);
}

float drawCross(vec2 position, float w, float h, vec2 center, float thickness, float smoothness) {
  float quarter1 = drawQuarterCross(position, w, h, center, thickness, smoothness);
  float quarter2 = drawQuarterCross(rotate(position, center, PI / 2.0), w, h, center, thickness, smoothness);
  float quarter3 = drawQuarterCross(rotate(position, center, PI), w, h, center, thickness, smoothness);
  float quarter4 = drawQuarterCross(rotate(position, center, 3.0 * PI / 2.0), w, h, center, thickness, smoothness);

  return max(quarter1, max(quarter2, max(quarter3, quarter4)));
}

vec3 drawOSymbol(vec4 diffuseColor) {
  if (uPlayerFill == 0.0) {
    return diffuseColor.rgb;
  }

  vec2 center = vec2(0.5, 0.5);
  float outerRadius = uSymbolRadius;
  float innerRadius = outerRadius - uSymbolGap;

  if (uPlayerFill == 1.0) {
    float outerCircle = drawCircle(vMyUv, center, outerRadius, uSymbolThickness, uSymbolSmoothness);
    float innerCircle = drawCircle(vMyUv, center, innerRadius, uSymbolThickness, uSymbolSmoothness);

    return mix(diffuseColor.rgb, uStrokeColor, max(outerCircle, innerCircle));
  }

  float angle = PI * uPlayerFill;
  vec2 outerCircleUv = rotate(vMyUv, center, PI / 2.0);
  vec2 innerCircleUv = rotate(vMyUv, center, PI / 2.0 + PI);

  float outerCircle = drawArc(outerCircleUv, center, outerRadius, angle, uSymbolThickness, uSymbolSmoothness);
  float innerCircle = drawArc(innerCircleUv, center, innerRadius, angle, uSymbolThickness, uSymbolSmoothness);

  return mix(diffuseColor.rgb, uStrokeColor, max(outerCircle, innerCircle));
}

vec3 drawXSymbol(vec4 diffuseColor) {
  if (uPlayerFill == 0.0) {
    return diffuseColor.rgb;
  }

  vec2 center = vec2(0.5, 0.5);
  float w = uSymbolGap;
  float h = (uSymbolRadius - uSymbolGap) * uXSymbolScale;
  vec2 rotatedUv = rotate(vMyUv, center, PI / 4.0);

  if (uPlayerFill == 1.0) {
    float cross = drawCross(rotatedUv, w, h, center, uSymbolThickness, uSymbolSmoothness);

    return mix(diffuseColor.rgb, uStrokeColor, cross);
  }

  float half1 = drawHalfCross(rotatedUv, w, h, center, uSymbolThickness, uSymbolSmoothness);
  float half2 = drawHalfCross(flipXY(rotatedUv), w, h, center, uSymbolThickness, uSymbolSmoothness);

  return mix(diffuseColor.rgb, uStrokeColor, max(half1, half2));
}

vec3 drawEdges(vec4 diffuseColor) {
  float thickness = uEdgeThickness * 0.5;
  float smoothness = uEdgeSmoothness;
  float blend = 1.0;

  if (uEdges.x == 1.0) {
    blend *= smoothstep(thickness, thickness + smoothness, vMyUv.x);
  }
  if (uEdges.y == 1.0) {
    blend *= smoothstep(thickness, thickness + smoothness, vMyUv.y);
  }
  if (uEdges.z == 1.0) {
    blend *= smoothstep(thickness, thickness + smoothness, 1.0 - vMyUv.x);
  }
  if (uEdges.w == 1.0) {
    blend *= smoothstep(thickness, thickness + smoothness, 1.0 - vMyUv.y);
  }

  return mix(diffuseColor.rgb, uStrokeColor, 1.0 - blend);
}

vec4 drawCell(vec4 diffuseColor) {
  vec4 newDiffuseColor = diffuseColor;

  if (dot(vMyNormal, upVector) > 0.99) {
    // render edges & player symbols on the top face
    newDiffuseColor.rgb = drawEdges(newDiffuseColor);

    if (uPlayer == 1) {
      newDiffuseColor.rgb = drawXSymbol(newDiffuseColor);
    } else if (uPlayer == 2) {
      newDiffuseColor.rgb = drawOSymbol(newDiffuseColor);
    }
  } else {
    // render side faces with a darker color
    newDiffuseColor.rgb = diffuseColor.rgb * 0.125;
  }

  return newDiffuseColor;
}
// </TacTicOe>

void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
  // <TacTicOe>
  diffuseColor = drawCell(diffuseColor);
  // </TacTicOe>
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}
