const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const TEMPLATE_DIR = path.join(__dirname, '../templates');
const TEMPLATE_CONFIG_PATH = path.join(TEMPLATE_DIR, 'config.json');
const ORBITRON_FONT_PATH = path.join(TEMPLATE_DIR, 'fonts', 'Orbitron.ttf');

function resolveConfiguredFontPath(configPathValue) {
  if (!configPathValue || typeof configPathValue !== 'string') {
    return null;
  }

  if (path.isAbsolute(configPathValue)) {
    return configPathValue;
  }

  return path.join(TEMPLATE_DIR, configPathValue);
}

function fitTextSize(text, font, preferred, min, maxWidth) {
  let size = preferred;
  while (size > min) {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) {
      return size;
    }
    size -= 1;
  }
  return min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadTemplateConfig() {
  if (!fs.existsSync(TEMPLATE_CONFIG_PATH)) {
    throw new Error(`Template config not found: ${TEMPLATE_CONFIG_PATH}`);
  }

  const raw = fs.readFileSync(TEMPLATE_CONFIG_PATH, 'utf-8');
  const parsed = JSON.parse(raw);

  if (!parsed.templateFile || !parsed.fields || !parsed.fields.name || !parsed.fields.team_name) {
    throw new Error('Invalid template config. Required: templateFile, fields.name, fields.team_name');
  }

  return parsed;
}

async function generateCertificate(participant) {
  const config = loadTemplateConfig();
  const templatePath = path.join(TEMPLATE_DIR, config.templateFile);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template PDF not found: ${templatePath}`);
  }

  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.getPages()[0];
  const pageWidth = page.getWidth();

  const nameText = (participant.name || '').trim();
  const teamText = (participant.team_name || '').trim();

  const nameCfg = config.fields.name;
  const teamCfg = config.fields.team_name;

  let nameFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let teamFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const configuredNameFontPath = resolveConfiguredFontPath(nameCfg.fontFile);
  const configuredTeamFontPath = resolveConfiguredFontPath(teamCfg.fontFile);

  if (configuredNameFontPath && fs.existsSync(configuredNameFontPath)) {
    const nameFontBytes = fs.readFileSync(configuredNameFontPath);
    nameFont = await pdfDoc.embedFont(nameFontBytes, { subset: true });
  } else if (fs.existsSync(ORBITRON_FONT_PATH)) {
    const orbitronBytes = fs.readFileSync(ORBITRON_FONT_PATH);
    nameFont = await pdfDoc.embedFont(orbitronBytes, { subset: true });
  }

  if (configuredTeamFontPath && fs.existsSync(configuredTeamFontPath)) {
    const teamFontBytes = fs.readFileSync(configuredTeamFontPath);
    teamFont = await pdfDoc.embedFont(teamFontBytes, { subset: true });
  } else {
    teamFont = nameFont;
  }

  // Draw participant name (centered, larger)
  const nameSize = fitTextSize(nameText, nameFont, nameCfg.preferredSize, nameCfg.minSize, nameCfg.maxWidth);
  const nameWidth = nameFont.widthOfTextAtSize(nameText, nameSize);

  page.drawText(nameText, {
    x: (pageWidth - nameWidth) / 2,
    y: nameCfg.y,
    size: nameSize,
    font: nameFont,
    color: rgb(nameCfg.color[0], nameCfg.color[1], nameCfg.color[2]),
  });

  // Draw team name in the blank after "Team" on the sentence block.
  const teamSize = fitTextSize(
    teamText,
    teamFont,
    teamCfg.preferredSize,
    teamCfg.minSize,
    teamCfg.maxWidth
  );
  let finalTeamSize = teamSize;
  let teamWidth = teamFont.widthOfTextAtSize(teamText, finalTeamSize);
  const teamCenterX = typeof teamCfg.centerX === 'number' ? teamCfg.centerX : pageWidth / 2;
  let teamX = teamCenterX - (teamWidth / 2);
  let teamY = teamCfg.y;
  const teamPlacement = teamCfg.placement || 'withTeamInline';
  const withPhrase = typeof teamCfg.withPhrase === 'string' ? teamCfg.withPhrase : 'with enthusiasm.';
  const withPhraseSize = typeof teamCfg.withPhraseSize === 'number' ? teamCfg.withPhraseSize : finalTeamSize;
  const withPhraseCenterX = typeof teamCfg.withPhraseCenterX === 'number' ? teamCfg.withPhraseCenterX : pageWidth / 2;
  const withPhraseWidth = teamFont.widthOfTextAtSize(withPhrase, withPhraseSize);
  const withPhraseStartX = withPhraseCenterX - (withPhraseWidth / 2);
  const withPhraseEndX = withPhraseStartX + withPhraseWidth;
  const usePhraseAnchor = teamCfg.usePhraseAnchor !== false;
  let drewTeamInline = false;

  if ((teamPlacement === 'withTeamInline' || teamCfg.forceWithTeamInline === true) && teamCfg.inlineSentence) {
    const inlineCfg = teamCfg.inlineSentence;
    const prefix = typeof inlineCfg.prefix === 'string' ? inlineCfg.prefix : 'with ';
    const suffix = typeof inlineCfg.suffix === 'string' ? inlineCfg.suffix : ' enthusiasm.';
    const lineX = typeof inlineCfg.x === 'number' ? inlineCfg.x : withPhraseStartX;
    const lineY = typeof inlineCfg.y === 'number' ? inlineCfg.y : teamCfg.y;
    const lineWidth = typeof inlineCfg.width === 'number' ? inlineCfg.width : withPhraseWidth;
    const lineHeight = typeof inlineCfg.height === 'number' ? inlineCfg.height : Math.max(12, finalTeamSize + 2);
    const lineBg = Array.isArray(inlineCfg.bgColor) ? inlineCfg.bgColor : [1, 1, 1];
    const lineTextColor = Array.isArray(inlineCfg.textColor) ? inlineCfg.textColor : [1, 1, 1];
    const teamTextColor = Array.isArray(teamCfg.color) ? teamCfg.color : [0, 0, 0];
    const inlinePreferred = typeof inlineCfg.preferredSize === 'number' ? inlineCfg.preferredSize : finalTeamSize;
    const inlineMin = typeof inlineCfg.minSize === 'number' ? inlineCfg.minSize : teamCfg.minSize;

    // Clear the existing static "with enthusiasm." text, then redraw with team inserted next to "with".
    page.drawRectangle({
      x: lineX,
      y: lineY,
      width: lineWidth,
      height: lineHeight,
      color: rgb(lineBg[0], lineBg[1], lineBg[2]),
    });

    let inlineSize = inlinePreferred;
    let prefixWidth = teamFont.widthOfTextAtSize(prefix, inlineSize);
    let teamInlineWidth = teamFont.widthOfTextAtSize(teamText, inlineSize);
    let suffixWidth = teamFont.widthOfTextAtSize(suffix, inlineSize);
    let totalInlineWidth = prefixWidth + teamInlineWidth + suffixWidth;

    while (inlineSize > inlineMin && totalInlineWidth > lineWidth) {
      inlineSize -= 1;
      prefixWidth = teamFont.widthOfTextAtSize(prefix, inlineSize);
      teamInlineWidth = teamFont.widthOfTextAtSize(teamText, inlineSize);
      suffixWidth = teamFont.widthOfTextAtSize(suffix, inlineSize);
      totalInlineWidth = prefixWidth + teamInlineWidth + suffixWidth;
    }

    let drawX = lineX + ((lineWidth - totalInlineWidth) / 2);
    const drawY = lineY + ((lineHeight - inlineSize) / 2);

    page.drawText(prefix, {
      x: drawX,
      y: drawY,
      size: inlineSize,
      font: teamFont,
      color: rgb(lineTextColor[0], lineTextColor[1], lineTextColor[2]),
    });

    drawX += prefixWidth;
    page.drawText(teamText, {
      x: drawX,
      y: drawY,
      size: inlineSize,
      font: teamFont,
      color: rgb(teamTextColor[0], teamTextColor[1], teamTextColor[2]),
    });

    drawX += teamInlineWidth;
    page.drawText(suffix, {
      x: drawX,
      y: drawY,
      size: inlineSize,
      font: teamFont,
      color: rgb(lineTextColor[0], lineTextColor[1], lineTextColor[2]),
    });

    drewTeamInline = true;
  }

  if (teamPlacement === 'beforeWith') {
    const gapBeforeWith = typeof teamCfg.gapBeforeWith === 'number' ? teamCfg.gapBeforeWith : 8;
    const withBaselineY = typeof teamCfg.withBaselineY === 'number' ? teamCfg.withBaselineY : teamCfg.y;
    const withStartX = usePhraseAnchor
      ? withPhraseStartX
      : (typeof teamCfg.withStartX === 'number' ? teamCfg.withStartX : teamCenterX);

    if (typeof teamCfg.maxWidthBeforeWith === 'number' && teamCfg.maxWidthBeforeWith > 0 && teamWidth > teamCfg.maxWidthBeforeWith) {
      finalTeamSize = fitTextSize(teamText, teamFont, finalTeamSize, teamCfg.minSize, teamCfg.maxWidthBeforeWith);
      teamWidth = teamFont.widthOfTextAtSize(teamText, finalTeamSize);
    }

    teamX = withStartX - teamWidth - gapBeforeWith;
    teamY = withBaselineY;
    teamX = clamp(teamX, 0, Math.max(0, pageWidth - teamWidth));
  } else if (teamPlacement === 'afterWith') {
    const gapAfterWith = typeof teamCfg.gapAfterWith === 'number' ? teamCfg.gapAfterWith : 8;
    const withBaselineY = typeof teamCfg.withBaselineY === 'number' ? teamCfg.withBaselineY : teamCfg.y;
    const withEndX = usePhraseAnchor
      ? withPhraseEndX
      : (typeof teamCfg.withEndX === 'number' ? teamCfg.withEndX : teamCenterX);
    const minAfterWithX = typeof teamCfg.minAfterWithX === 'number' ? teamCfg.minAfterWithX : 0;

    if (typeof teamCfg.maxWidthAfterWith === 'number' && teamCfg.maxWidthAfterWith > 0 && teamWidth > teamCfg.maxWidthAfterWith) {
      finalTeamSize = fitTextSize(teamText, teamFont, finalTeamSize, teamCfg.minSize, teamCfg.maxWidthAfterWith);
      teamWidth = teamFont.widthOfTextAtSize(teamText, finalTeamSize);
    }

    teamX = Math.max(withEndX + gapAfterWith, minAfterWithX);
    teamY = withBaselineY;
    teamX = clamp(teamX, 0, Math.max(0, pageWidth - teamWidth));
  }

  if (teamPlacement === 'afterTeam' && teamCfg.eraseUnderline) {
    page.drawRectangle({
      x: teamCfg.eraseUnderline.x,
      y: teamCfg.eraseUnderline.y,
      width: teamCfg.eraseUnderline.width,
      height: teamCfg.eraseUnderline.height,
      color: rgb(
        teamCfg.eraseUnderline.color[0],
        teamCfg.eraseUnderline.color[1],
        teamCfg.eraseUnderline.color[2]
      ),
    });

    // Place the team label directly after "Team" (left-anchored in placeholder).
    const inlinePaddingLeft = typeof teamCfg.inlinePaddingLeft === 'number' ? teamCfg.inlinePaddingLeft : 3;
    const baselineOffset = typeof teamCfg.baselineOffset === 'number' ? teamCfg.baselineOffset : 1;
    const maxInlineWidth = Math.max(0, teamCfg.eraseUnderline.width - inlinePaddingLeft - 2);

    if (teamWidth > maxInlineWidth) {
      // Keep text inside the placeholder without changing configured max width constraints.
      finalTeamSize = fitTextSize(teamText, teamFont, finalTeamSize, teamCfg.minSize, maxInlineWidth);
      teamWidth = teamFont.widthOfTextAtSize(teamText, finalTeamSize);
    }

    teamX = teamCfg.eraseUnderline.x + inlinePaddingLeft;
    teamY = teamCfg.eraseUnderline.y + ((teamCfg.eraseUnderline.height - finalTeamSize) / 2) + baselineOffset;
    teamX = clamp(teamX, 0, Math.max(0, pageWidth - teamWidth));
  }

  if (!drewTeamInline) {
    page.drawText(teamText, {
      x: teamX,
      y: teamY,
      size: finalTeamSize,
      font: teamFont,
      color: rgb(teamCfg.color[0], teamCfg.color[1], teamCfg.color[2]),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateCertificate };
