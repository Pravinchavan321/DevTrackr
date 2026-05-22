import * as exportService from '../services/export.service.js';
import asyncHandler from '../utils/asyncHandler.js';

export const downloadRepositoryPdf = asyncHandler(async (req, res) => {
  const { repoId } = req.params;
  const userId = req.user._id;

  // 1. Verify access first to allow clean JSON error output if unauthorized/invalid
  const repo = await exportService.verifyRepositoryAccess(repoId, userId);

  // 2. Set headers for attachment download
  const safeName = repo.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="devtrackr-report-${safeName}.pdf"`);

  // 3. Generate PDF and stream to response
  await exportService.generateRepositoryPdfReport(repoId, userId, res);
});
