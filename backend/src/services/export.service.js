import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';
import Repository from '../models/Repository.model.js';
import Commit from '../models/Commit.model.js';
import PullRequest from '../models/PullRequest.model.js';
import Issue from '../models/Issue.model.js';
import AIInsight from '../models/AIInsight.model.js';

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Verifies repository ownership and validates the repository ID format.
 * @param {string} repoId
 * @param {string} userId
 * @returns {Promise<object>} The repository document
 */
export const verifyRepositoryAccess = async (repoId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(repoId)) {
    throw new AppError('Invalid repository ID format', 400);
  }

  const repo = await Repository.findById(repoId).lean();
  if (!repo) {
    throw new AppError('Repository not found', 404);
  }

  if (repo.userId.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to access this repository', 403);
  }

  return repo;
};

const formatDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toISOString().split('T')[0];
};

/**
 * Loads all data required for the repository report.
 */
export const getReportData = async (repoId, userId) => {
  const repo = await verifyRepositoryAccess(repoId, userId);
  const repoObjectId = new mongoose.Types.ObjectId(repoId);

  // 1. Gather stats
  const totalCommits = await Commit.countDocuments({ repoId: repoObjectId });
  const totalPRs = await PullRequest.countDocuments({ repoId: repoObjectId });
  const mergedPRs = await PullRequest.countDocuments({ repoId: repoObjectId, merged: true });
  const openPRs = await PullRequest.countDocuments({ repoId: repoObjectId, state: 'open' });
  const closedPRs = await PullRequest.countDocuments({ repoId: repoObjectId, state: 'closed', merged: false });
  const openIssues = await Issue.countDocuments({ repoId: repoObjectId, state: 'open' });
  const closedIssues = await Issue.countDocuments({ repoId: repoObjectId, state: 'closed' });

  const prStats = await PullRequest.aggregate([
    { $match: { repoId: repoObjectId, merged: true } },
    {
      $project: {
        durationHours: {
          $divide: [
            { $subtract: ['$mergedAt', '$githubCreatedAt'] },
            1000 * 60 * 60
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$durationHours' }
      }
    }
  ]);
  const avgMergeTimeHours = prStats.length > 0 ? Math.round(prStats[0].avgDuration * 100) / 100 : 0;

  // 2. Contributors stats
  const contributorsPipeline = [
    { $match: { repoId: repoObjectId } },
    {
      $project: {
        identity: {
          $cond: {
            if: { $and: [{ $ne: ['$author.login', ''] }, { $ne: ['$author.login', null] }] },
            then: '$author.login',
            else: {
              $cond: {
                if: { $and: [{ $ne: ['$author.email', ''] }, { $ne: ['$author.email', null] }] },
                then: '$author.email',
                else: { $ifNull: ['$author.name', 'Unknown'] }
              }
            }
          }
        },
        author: 1,
        additions: { $ifNull: ['$additions', 0] },
        deletions: { $ifNull: ['$deletions', 0] },
        filesChanged: { $ifNull: ['$filesChanged', 0] },
        committedAt: 1
      }
    },
    {
      $group: {
        _id: '$identity',
        login: { $first: '$author.login' },
        name: { $first: '$author.name' },
        avatarUrl: { $first: '$author.avatarUrl' },
        email: { $first: '$author.email' },
        totalCommits: { $sum: 1 },
        additions: { $sum: '$additions' },
        deletions: { $sum: '$deletions' },
        filesChanged: { $sum: '$filesChanged' },
        lastCommitAt: { $max: '$committedAt' }
      }
    },
    {
      $project: {
        _id: 0,
        login: {
          $cond: {
            if: { $and: [{ $ne: ['$login', ''] }, { $ne: ['$login', null] }] },
            then: '$login',
            else: {
              $cond: {
                if: { $and: [{ $ne: ['$email', ''] }, { $ne: ['$email', null] }] },
                then: '$email',
                else: { $ifNull: ['$name', 'Unknown'] }
              }
            }
          }
        },
        name: {
          $cond: {
            if: { $and: [{ $ne: ['$name', ''] }, { $ne: ['$name', null] }] },
            then: '$name',
            else: {
              $cond: {
                if: { $and: [{ $ne: ['$login', ''] }, { $ne: ['$login', null] }] },
                then: '$login',
                else: { $ifNull: ['$email', 'Unknown'] }
              }
            }
          }
        },
        avatarUrl: { $ifNull: ['$avatarUrl', ''] },
        totalCommits: 1,
        additions: 1,
        deletions: 1,
        filesChanged: 1,
        lastCommitAt: 1
      }
    },
    { $sort: { totalCommits: -1 } }
  ];
  const contributors = await Commit.aggregate(contributorsPipeline);
  const totalContributors = contributors.length;

  // 3. Recent commits (max 20)
  const recentCommits = await Commit.find({ repoId: repoObjectId })
    .sort({ committedAt: -1 })
    .limit(20)
    .lean();

  // 4. Recent PRs (max 10)
  const recentPRs = await PullRequest.find({ repoId: repoObjectId })
    .sort({ githubCreatedAt: -1 })
    .limit(10)
    .lean();

  // 5. Recent issues (max 10)
  const recentIssues = await Issue.find({ repoId: repoObjectId })
    .sort({ githubCreatedAt: -1 })
    .limit(10)
    .lean();

  // 6. Cached AI insights (fetch latest for each type)
  const sprintSummary = await AIInsight.findOne({ repoId: repoObjectId, type: 'sprint_summary' }).sort({ generatedAt: -1 }).lean();
  const bottleneck = await AIInsight.findOne({ repoId: repoObjectId, type: 'bottleneck' }).sort({ generatedAt: -1 }).lean();
  const recommendations = await AIInsight.findOne({ repoId: repoObjectId, type: 'recommendations' }).sort({ generatedAt: -1 }).lean();

  return {
    repo,
    stats: {
      totalCommits,
      totalPRs,
      mergedPRs,
      openPRs,
      closedPRs,
      openIssues,
      closedIssues,
      totalContributors,
      avgMergeTimeHours
    },
    contributors,
    recentCommits,
    recentPRs,
    recentIssues,
    insights: {
      sprintSummary,
      bottleneck,
      recommendations
    }
  };
};

/**
 * Generates the PDF report using PDFKit and pipes it to a writable stream.
 */
export const generateRepositoryPdfReport = async (repoId, userId, writableStream) => {
  const data = await getReportData(repoId, userId);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    bufferPages: true
  });

  doc.pipe(writableStream);

  // Background for every page
  doc.on('pageAdded', () => {
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
  });

  // 1. Cover Page
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
  
  // Header accent
  doc.rect(0, 0, 595.28, 200).fill('#f8f8f8');
  doc.strokeColor('#e5e7eb').lineWidth(1).rect(0, 0, 595.28, 200).stroke();

  // Title on cover page
  doc.fillColor('#1f1f1f')
     .font('Helvetica-Bold')
     .fontSize(28)
     .text('DevTrackr', 50, 60)
     .fontSize(20)
     .text('Repository Productivity Report', 50, 100);

  // Repository Full Name
  doc.fillColor('#7c3aed')
     .font('Helvetica-Bold')
     .fontSize(14)
     .text(data.repo.fullName, 50, 150);

  // Generated date
  doc.font('Helvetica-Oblique')
     .fontSize(10)
     .fillColor('#6b7280')
     .text(`Generated on: ${new Date().toUTCString()}`, 50, 175);

  // Repo details card background
  doc.rect(50, 240, 495, 140).fill('#f8f8f8');
  doc.strokeColor('#e5e7eb').lineWidth(1).rect(50, 240, 495, 140).stroke();

  doc.fillColor('#1f1f1f')
     .font('Helvetica-Bold')
     .fontSize(12)
     .text('Repository Information', 65, 255);

  doc.font('Helvetica')
     .fontSize(10)
     .fillColor('#4b5563')
     .text('Description:', 65, 280)
     .text('Primary Language:', 65, 300)
     .text('Stars:', 65, 320)
     .text('Forks:', 65, 340)
     .text('Open Issues:', 300, 320)
     .text('Default Branch:', 300, 340);

  doc.fillColor('#1f1f1f')
     .text(data.repo.description || 'No description provided.', 150, 280, { width: 380, height: 15, ellipsis: true })
     .text(data.repo.language || 'Not specified', 170, 300)
     .text(data.repo.stars?.toString() || '0', 100, 320)
     .text(data.repo.forks?.toString() || '0', 100, 340)
     .text(data.repo.openIssuesCount?.toString() || '0', 380, 320)
     .text(data.repo.defaultBranch || 'main', 380, 340);

  // Footer on cover page
  doc.fillColor('#6b7280')
     .font('Helvetica')
     .fontSize(9)
     .text('DevTrackr AI-Powered Developer Productivity Insights', 50, 750, { align: 'center', width: 495 });

  doc.addPage();

  const pageBottomY = 730;
  const contentWidth = 495;

  const sanitizePdfText = (value, maxLength = 900) => {
    const text = String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
  };

  const checkPageOverflow = (neededHeight) => {
    if (doc.y + neededHeight > pageBottomY) {
      doc.addPage();
    }
  };

  const drawSectionHeader = (title) => {
    checkPageOverflow(50);
    const headerY = doc.y;
    doc.rect(50, headerY, contentWidth, 24).fill('#4c1d95');
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(12)
       .text(title, 65, headerY + 6, { width: contentWidth - 30 });
    doc.y = headerY + 36;
  };

  // 2. Stats Summary
  drawSectionHeader('Statistics Summary');

  const statsStartY = doc.y;
  doc.rect(50, statsStartY, 495, 120).fill('#f8f8f8');
  doc.strokeColor('#e5e7eb').lineWidth(1).rect(50, statsStartY, 495, 120).stroke();

  doc.fillColor('#4b5563')
     .font('Helvetica-Bold')
     .fontSize(10)
     .text('Total Commits:', 70, statsStartY + 15)
     .text('Total Pull Requests:', 70, statsStartY + 35)
     .text('Merged Pull Requests:', 70, statsStartY + 55)
     .text('Open Pull Requests:', 70, statsStartY + 75)
     .text('Closed Pull Requests:', 70, statsStartY + 95)
     .text('Open Issues:', 300, statsStartY + 15)
     .text('Closed Issues:', 300, statsStartY + 35)
     .text('Total Contributors:', 300, statsStartY + 55)
     .text('Avg PR Merge Time:', 300, statsStartY + 75);

  doc.fillColor('#1f1f1f')
     .font('Helvetica')
     .text(data.stats.totalCommits.toString(), 200, statsStartY + 15)
     .text(data.stats.totalPRs.toString(), 200, statsStartY + 35)
     .text(data.stats.mergedPRs.toString(), 200, statsStartY + 55)
     .text(data.stats.openPRs.toString(), 200, statsStartY + 75)
     .text(data.stats.closedPRs.toString(), 200, statsStartY + 95)
     .text(data.stats.openIssues.toString(), 420, statsStartY + 15)
     .text(data.stats.closedIssues.toString(), 420, statsStartY + 35)
     .text(data.stats.totalContributors.toString(), 420, statsStartY + 55)
     .text(`${data.stats.avgMergeTimeHours} hours`, 420, statsStartY + 75);

  doc.y = statsStartY + 120;
  doc.moveDown(1.5);

  // Helper for rendering tables
  const drawTableHeader = (headers, colWidths, startX, tableY) => {
    const tableWidth = Math.min(contentWidth, colWidths.reduce((sum, width) => sum + width, 0) + 10);
    doc.rect(startX, tableY, tableWidth, 22).fill('#e5e7eb');
    doc.fillColor('#1f1f1f').font('Helvetica-Bold').fontSize(9);

    let currentX = startX + 5;
    headers.forEach((h, i) => {
      doc.text(h.label, currentX, tableY + 6, { width: colWidths[i], align: h.align || 'left' });
      currentX += colWidths[i];
    });

    return tableY + 22;
  };

  const drawTable = (headers, rows, colWidths, startX = 50) => {
    checkPageOverflow(50);
    let tableY = drawTableHeader(headers, colWidths, startX, doc.y);

    rows.forEach((row, rowIndex) => {
      const normalizedRow = row.map((cell, i) =>
        sanitizePdfText(cell, headers[i]?.maxLength || 420)
      );

      doc.font('Helvetica').fontSize(8.5);
      const cellHeights = normalizedRow.map((cell, i) =>
        doc.heightOfString(cell || ' ', {
          width: colWidths[i],
          align: headers[i].align || 'left',
          lineGap: 1
        })
      );
      const rowHeight = Math.max(24, Math.ceil(Math.max(...cellHeights) + 12));

      if (tableY + rowHeight > pageBottomY) {
        doc.addPage();
        tableY = drawTableHeader(headers, colWidths, startX, doc.y);
      }

      const tableWidth = Math.min(contentWidth, colWidths.reduce((sum, width) => sum + width, 0) + 10);
      doc.rect(startX, tableY, tableWidth, rowHeight).fill(rowIndex % 2 === 0 ? '#f5f5fa' : '#ffffff');
      
      doc.fillColor('#1f1f1f').font('Helvetica').fontSize(8.5);
      let currentX = startX + 5;
      normalizedRow.forEach((cell, i) => {
        doc.text(cell || '', currentX, tableY + 6, {
          width: colWidths[i],
          align: headers[i].align || 'left',
          lineGap: 1
        });
        currentX += colWidths[i];
      });

      tableY += rowHeight;
      doc.y = tableY;
    });
    doc.moveDown(1.5);
  };

  // 3. Top Contributors Table
  drawSectionHeader('Top Contributors');
  if (data.contributors.length === 0) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10).text('No contributor data available.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    checkPageOverflow(60);
    const headers = [
      { label: 'Contributor' }, { label: 'Commits', align: 'right' },
      { label: 'Additions', align: 'right' }, { label: 'Deletions', align: 'right' },
      { label: 'Last Commit', align: 'right' }
    ];
    const colWidths = [140, 60, 80, 80, 120];
    const rows = data.contributors.slice(0, 10).map(c => [
      c.login || c.name || 'Unknown',
      c.totalCommits.toString(),
      `+${c.additions}`,
      `-${c.deletions}`,
      formatDate(c.lastCommitAt)
    ]);
    drawTable(headers, rows, colWidths);
  }

  // 4. Commit Activity Summary
  drawSectionHeader('Recent Commit Activity (Max 20)');
  if (data.recentCommits.length === 0) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10).text('No commit activity available.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    checkPageOverflow(60);
    const headers = [
      { label: 'Commit Message' }, { label: 'Author' },
      { label: 'Changes', align: 'right' }, { label: 'Committed Date', align: 'right' }
    ];
    const colWidths = [220, 85, 80, 100];
    const rows = data.recentCommits.map(c => [
      (c.message || '').split('\n')[0],
      c.author?.login || c.author?.name || 'Unknown',
      `+${c.additions || 0}/-${c.deletions || 0}`,
      formatDate(c.committedAt)
    ]);
    drawTable(headers, rows, colWidths);
  }

  // 5. Pull Request Summary
  drawSectionHeader('Recent Pull Requests (Max 10)');
  if (data.recentPRs.length === 0) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10).text('No pull requests available.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    checkPageOverflow(60);
    const headers = [
      { label: 'PR #' }, { label: 'Title' }, { label: 'State' },
      { label: 'Created', align: 'right' }, { label: 'Merged', align: 'right' }
    ];
    const colWidths = [40, 200, 60, 90, 90];
    const rows = data.recentPRs.map(pr => {
      let stateLabel = pr.state || 'closed';
      if (pr.merged) stateLabel = 'merged';
      return [
        `#${pr.number}`,
        pr.title || '',
        stateLabel.toUpperCase(),
        formatDate(pr.githubCreatedAt),
        formatDate(pr.mergedAt)
      ];
    });
    drawTable(headers, rows, colWidths);
  }

  // 6. Issue Summary
  drawSectionHeader('Recent Issues (Max 10)');
  if (data.recentIssues.length === 0) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(10).text('No issues available.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    checkPageOverflow(60);
    const headers = [
      { label: 'Issue #' }, { label: 'Title' }, { label: 'State' },
      { label: 'Created', align: 'right' }, { label: 'Closed', align: 'right' }
    ];
    const colWidths = [50, 230, 50, 75, 75];
    const rows = data.recentIssues.map(issue => [
      `#${issue.number}`,
      issue.title || '',
      (issue.state || 'open').toUpperCase(),
      formatDate(issue.githubCreatedAt),
      formatDate(issue.closedAt)
    ]);
    drawTable(headers, rows, colWidths);
  }

  // 7. AI Sprint Summary
  drawSectionHeader('AI Sprint Summary');
  const sprintSummaryInsight = data.insights.sprintSummary;
  if (!sprintSummaryInsight || !sprintSummaryInsight.parsedData) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(9).text('AI Insight not cached. Please run generation in the app dashboard to include this section in the report.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    const { summary, velocity, highlights, concerns, sprintScore } = sprintSummaryInsight.parsedData;
    const scoreText = `${sprintScore || 'N/A'}/10`;
    const velocityText = sanitizePdfText(String(velocity || 'unknown').toUpperCase(), 220);
    doc.font('Helvetica-Bold').fontSize(10);
    const scoreHeight = doc.heightOfString(scoreText, { width: 190, lineGap: 1 });
    const velocityHeight = doc.heightOfString(velocityText, { width: 225, lineGap: 1 });
    const boxHeight = Math.max(52, Math.ceil(Math.max(scoreHeight, velocityHeight) + 30));

    checkPageOverflow(boxHeight + 20);
    const boxY = doc.y;
    doc.rect(50, boxY, contentWidth, boxHeight).fill('#f8f8f8');
    doc.strokeColor('#7c3aed').lineWidth(1).rect(50, boxY, contentWidth, boxHeight).stroke();

    doc.fillColor('#7c3aed')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text('Sprint Score', 65, boxY + 10, { width: 190 })
       .text('Velocity', 300, boxY + 10, { width: 225 })
       .fontSize(9.5)
       .text(scoreText, 65, boxY + 27, { width: 190, lineGap: 1 })
       .text(velocityText, 300, boxY + 27, { width: 225, lineGap: 1 });

    doc.y = boxY + boxHeight;
    doc.moveDown(1);

    checkPageOverflow(80);
    doc.fillColor('#1f1f1f').font('Helvetica-Bold').fontSize(10).text('Executive Summary', 50, doc.y);
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9.5).fillColor('#4b5563').text(
      sanitizePdfText(summary || 'No summary details provided.', 1200),
      50,
      doc.y,
      { width: contentWidth, lineGap: 2 }
    );
    doc.moveDown(1);

    if (highlights && highlights.length > 0) {
      checkPageOverflow(50);
      doc.fillColor('#1f1f1f').font('Helvetica-Bold').fontSize(10).text('Key Highlights', 50, doc.y);
      doc.moveDown(0.4);
      highlights.forEach(h => {
        const bulletText = `- ${sanitizePdfText(h, 500)}`;
        doc.font('Helvetica').fontSize(9);
        checkPageOverflow(doc.heightOfString(bulletText, { width: 475, lineGap: 2 }) + 6);
        doc.fillColor('#4b5563').text(bulletText, 60, doc.y, { width: 475, lineGap: 2 });
        doc.moveDown(0.2);
      });
      doc.moveDown(1);
    }

    if (concerns && concerns.length > 0) {
      checkPageOverflow(50);
      doc.fillColor('#1f1f1f').font('Helvetica-Bold').fontSize(10).text('Areas of Concern', 50, doc.y);
      doc.moveDown(0.4);
      concerns.forEach(c => {
        const bulletText = `- ${sanitizePdfText(c, 500)}`;
        doc.font('Helvetica').fontSize(9);
        checkPageOverflow(doc.heightOfString(bulletText, { width: 475, lineGap: 2 }) + 6);
        doc.fillColor('#4b5563').text(bulletText, 60, doc.y, { width: 475, lineGap: 2 });
        doc.moveDown(0.2);
      });
      doc.moveDown(1.5);
    }
  }

  // 8. AI Bottlenecks
  drawSectionHeader('AI Bottlenecks Detection');
  const bottleneckInsight = data.insights.bottleneck;
  if (!bottleneckInsight || !bottleneckInsight.parsedData) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(9).text('AI Insight not cached. Please run generation in the app dashboard to include this section in the report.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    const { bottlenecks, riskLevel, topRecommendation } = bottleneckInsight.parsedData;
    checkPageOverflow(45);
    const boxY = doc.y;
    doc.rect(50, boxY, contentWidth, 40).fill('#f8f8f8');
    doc.strokeColor(riskLevel === 'high' ? '#ef4444' : riskLevel === 'medium' ? '#f59e0b' : '#10b981').lineWidth(1).rect(50, boxY, contentWidth, 40).stroke();

    doc.fillColor(riskLevel === 'high' ? '#ef4444' : riskLevel === 'medium' ? '#f59e0b' : '#10b981')
       .font('Helvetica-Bold')
       .fontSize(10)
       .text(`Overall Risk Level: ${(riskLevel || 'low').toUpperCase()}`, 65, boxY + 15);

    doc.y = boxY + 40;
    doc.moveDown(1);

    if (topRecommendation) {
      checkPageOverflow(50);
      doc.fillColor('#1f1f1f').font('Helvetica-Bold').fontSize(10).text('Top Recommendation', 50, doc.y);
      doc.moveDown(0.3);
      doc.font('Helvetica').fontSize(9.5).fillColor('#4b5563').text(
        sanitizePdfText(topRecommendation, 1000),
        50,
        doc.y,
        { width: contentWidth, lineGap: 2 }
      );
      doc.moveDown(1);
    }

    if (bottlenecks && bottlenecks.length > 0) {
      checkPageOverflow(80);
      doc.fillColor('#1f1f1f').font('Helvetica-Bold').fontSize(10).text('Detected Bottlenecks', 50, doc.y);
      doc.moveDown(0.5);

      const headers = [{ label: 'Type' }, { label: 'Severity' }, { label: 'Description' }, { label: 'Suggestion' }];
      const colWidths = [100, 60, 140, 180];
      const rows = bottlenecks.map(b => [
        b.type || 'N/A',
        (b.severity || 'low').toUpperCase(),
        b.description || 'N/A',
        b.suggestion || 'N/A'
      ]);
      drawTable(headers, rows, colWidths);
    }
  }

  // 9. AI Recommendations
  drawSectionHeader('AI Sprint Recommendations');
  const recommendationsInsight = data.insights.recommendations;
  if (!recommendationsInsight || !recommendationsInsight.parsedData) {
    doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(9).text('AI Insight not cached. Please run generation in the app dashboard to include this section in the report.', 50, doc.y);
    doc.moveDown(1.5);
  } else {
    const { recommendations: recsList, nextBestAction } = recommendationsInsight.parsedData;
    if (nextBestAction) {
      const actionText = `Next Best Action: ${sanitizePdfText(nextBestAction, 800)}`;
      doc.font('Helvetica-Bold').fontSize(9.5);
      const actionHeight = doc.heightOfString(actionText, { width: 460, lineGap: 2 });
      const boxHeight = Math.max(44, Math.ceil(actionHeight + 24));

      checkPageOverflow(boxHeight + 14);
      const boxY = doc.y;
      doc.rect(50, boxY, contentWidth, boxHeight).fill('#f8f8f8');
      doc.strokeColor('#10b981').lineWidth(1).rect(50, boxY, contentWidth, boxHeight).stroke();

      doc.fillColor('#10b981')
         .font('Helvetica-Bold')
         .fontSize(9.5)
         .text(actionText, 65, boxY + 12, { width: 460, lineGap: 2 });

      doc.y = boxY + boxHeight;
      doc.moveDown(1);
    }

    if (recsList && recsList.length > 0) {
      checkPageOverflow(50);
      doc.fillColor('#1f1f1f').font('Helvetica-Bold').fontSize(10).text('Prioritized Recommendations', 50, doc.y);
      doc.moveDown(0.5);

      const headers = [{ label: 'Priority' }, { label: 'Recommendation' }, { label: 'Reason' }, { label: 'Action' }];
      const colWidths = [50, 130, 130, 170];
      const rows = recsList.map(r => [
        (r.priority || 'low').toUpperCase(),
        r.title || 'N/A',
        r.reason || 'N/A',
        r.action || 'N/A'
      ]);
      drawTable(headers, rows, colWidths);
    }
  }

  // 10. Footer and page numbers
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    if (i > 0) {
      doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(50, 780).lineTo(545, 780).stroke();
      doc.fillColor('#6b7280')
         .font('Helvetica')
         .fontSize(8);
      doc.text('Generated by DevTrackr', 50, 788);
      doc.text(`Page ${i + 1} of ${range.count}`, 50, 788, { align: 'right', width: 495 });
    }
  }

  doc.end();
};
