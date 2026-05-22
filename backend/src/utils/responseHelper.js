export const sendSuccess = (res, data, message = '', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

export const sendError = (res, message, errors = [], statusCode = 400) => {
  res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

export const sendPaginatedSuccess = (
  res,
  data,
  total,
  page,
  limit,
  message = '',
  statusCode = 200
) => {
  const totalPages = Math.ceil(total / limit);

  res.status(statusCode).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages
    },
    message
  });
};
