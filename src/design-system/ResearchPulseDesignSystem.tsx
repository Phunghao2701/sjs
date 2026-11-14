import type { ReactNode } from 'react'
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, List, ListItemButton, Paper, TextField, Typography } from '@mui/material'
import './design-system.css'

type ColorToken = { name: string; value: string; usage: string }

const colorTokens: ColorToken[] = [
  { name: '--app-bg', value: '#fbfbfb', usage: 'Nền vùng làm việc' },
  { name: '--surface', value: '#ffffff', usage: 'Card, nút và menu' },
  { name: '--sidebar-bg', value: '#f8f9fa', usage: 'Nền điều hướng' },
  { name: '--ink', value: '#171a1e', usage: 'Chữ chính' },
  { name: '--muted', value: '#626972', usage: 'Mô tả và chữ phụ' },
  { name: '--soft-muted', value: '#69717a', usage: 'Metadata nhẹ trên nền sáng' },
  { name: '--stroke', value: '#e2e5e9', usage: 'Viền card và control' },
  { name: '--hover', value: '#f0f2f5', usage: 'Nền hover và mục đang chọn' },
  { name: '--brand', value: '#0879c9', usage: 'Hành động chính, link và focus' },
  { name: '--brand-hover', value: '#0669af', usage: 'Nền hover của hành động chính' },
  { name: '--brand-soft', value: '#eaf5fc', usage: 'Nền nhấn nhẹ' },
]

const contrastPairs = [
  { label: 'Chữ chính / nền app', foreground: '#171a1e', background: '#fbfbfb' },
  { label: 'Chữ phụ / nền app', foreground: '#626972', background: '#fbfbfb' },
  { label: 'Chữ metadata / nền app', foreground: '#69717a', background: '#fbfbfb' },
  { label: 'Chữ trắng / brand', foreground: '#ffffff', background: '#0879c9' },
]

function contrastRatio(foreground: string, background: string) {
  const luminance = (color: string) => {
    const channels = color.match(/[a-f\d]{2}/gi)?.map((channel) => parseInt(channel, 16) / 255) ?? [0, 0, 0]
    const [red, green, blue] = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }
  const values = [luminance(foreground), luminance(background)].sort((first, second) => second - first)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

function StateLabel({ children }: { children: string }) {
  return <Typography className="ds-state-label">{children}</Typography>
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section className="ds-section" aria-labelledby={`${id}-title`}>
      <div className="ds-section-heading">
        <Typography component="h2" id={`${id}-title`}>{title}</Typography>
        {description ? <Typography component="p">{description}</Typography> : null}
      </div>
      {children}
    </section>
  )
}

export function ResearchPulseDesignSystem() {
  return (
    <Box className="ds-page">
      <div className="ds-content">
        <header className="ds-page-header">
          <div>
            <Typography component="h1">ResearchPulse design system</Typography>
            <Typography component="p">Token và component hiện hành cho giao diện nghiên cứu khoa học.</Typography>
          </div>
          <Button component="a" href="/" variant="text" className="ds-back-link">Trở về ứng dụng</Button>
        </header>

        <Section id="colors" title="Màu sắc" description="Nền sáng, bề mặt trắng và xanh HyperDataLab làm điểm nhấn.">
          <div className="ds-color-grid">
            {colorTokens.map((token) => (
              <Paper key={token.name} variant="outlined" className="ds-color-card">
                <div className="ds-color-swatch" style={{ backgroundColor: token.value, borderColor: token.value === '#ffffff' || token.value === '#fbfbfb' ? '#e2e5e9' : undefined }} />
                <div className="ds-color-copy">
                  <code>{token.name}</code>
                  <code>{token.value}</code>
                  <Typography component="p">{token.usage}</Typography>
                </div>
              </Paper>
            ))}
          </div>
          <div className="ds-contrast-list" aria-label="Tỷ lệ tương phản màu chữ">
            {contrastPairs.map((pair) => {
              const ratio = contrastRatio(pair.foreground, pair.background)
              return (
                <div className="ds-contrast-row" key={pair.label}>
                  <span className="ds-contrast-sample" style={{ color: pair.foreground, backgroundColor: pair.background }}>{pair.label}</span>
                  <span>{ratio.toFixed(2)}:1</span>
                  {ratio < 4.5 ? <span className="ds-contrast-warning">Dưới 4.5:1</span> : null}
                </div>
              )
            })}
          </div>
        </Section>

        <Section id="typography" title="Chữ" description="Inter một họ chữ; phân cấp bằng kích cỡ và độ đậm.">
          <div className="ds-type-list">
            <div className="ds-type-row"><Typography component="span" className="ds-type-meta">Tiêu đề trang · 27px / 600</Typography><Typography component="p" className="ds-type-title">Khám phá xu hướng công bố khoa học</Typography></div>
            <div className="ds-type-row"><Typography component="span" className="ds-type-meta">Tiêu đề khu vực · 16px / 600</Typography><Typography component="p" className="ds-type-section">Publication Trend</Typography></div>
            <div className="ds-type-row"><Typography component="span" className="ds-type-meta">Nội dung trang · 16px / 400</Typography><Typography component="p" className="ds-type-body">Theo dõi xu hướng nghiên cứu theo chủ đề và thời gian.</Typography></div>
            <div className="ds-type-row"><Typography component="span" className="ds-type-meta">Mô tả · 13px / 400</Typography><Typography component="p" className="ds-type-description">Số liệu được tổng hợp từ các nguồn nghiên cứu học thuật.</Typography></div>
            <div className="ds-type-row"><Typography component="span" className="ds-type-meta">Nút · 14px / 500</Typography><Typography component="p" className="ds-type-button">Tạo dự án</Typography></div>
            <div className="ds-type-row"><Typography component="span" className="ds-type-meta">Sidebar · 13px / 400</Typography><Typography component="p" className="ds-type-sidebar">Dashboard</Typography></div>
            <div className="ds-type-row"><Typography component="span" className="ds-type-meta">Mô tả sidebar · 10.5px / 400</Typography><Typography component="p" className="ds-type-sidebar-description">My workspace</Typography></div>
          </div>
        </Section>

        <Section id="layout" title="Khoảng cách, viền và bề mặt" description="Nhịp cơ sở 4px; card phẳng, lớp nổi chỉ dùng cho menu và hộp thoại.">
          <div className="ds-layout-grid">
            <Paper variant="outlined" className="ds-spec-card">
              <StateLabel>Thang khoảng cách</StateLabel>
              <div className="ds-spacing-list">
                {[4, 8, 12, 16, 20, 24, 32, 40].map((size) => <div className="ds-spacing-row" key={size}><span>{size}px</span><div style={{ width: size }} /></div>)}
              </div>
            </Paper>
            <Paper variant="outlined" className="ds-spec-card">
              <StateLabel>Bo góc và viền</StateLabel>
              <div className="ds-radius-list">
                {[['Điều hướng', 7], ['Control', 7], ['Card', 9], ['Hộp thoại', 8]].map(([name, radius]) => (
                  <div className="ds-radius-item" key={name as string}>
                    <div style={{ borderRadius: `${radius}px` }} />
                    <span>{name} · {radius}px</span>
                  </div>
                ))}
              </div>
              <Divider className="ds-divider" />
              <div className="ds-surface-sample">Card: 1px viền, không bóng</div>
              <div className="ds-surface-sample ds-overlay-sample">Menu / hộp thoại: bóng lớp nổi</div>
            </Paper>
          </div>
        </Section>

        <Section id="buttons" title="Nút" description="Bốn dạng MUI được dùng theo mức ưu tiên; icon chỉ xuất hiện khi có trong Figma.">
          <div className="ds-demo-block">
            <StateLabel>Thường</StateLabel>
            <div className="ds-button-row">
              <Button variant="outlined" className="ds-button ds-outline">Outline</Button>
              <Button variant="contained" className="ds-button ds-primary">Primary</Button>
              <Button variant="contained" className="ds-button ds-secondary">Secondary</Button>
              <Button variant="text" className="ds-button ds-ghost">Ghost</Button>
            </div>
          </div>
          <div className="ds-demo-block">
            <StateLabel>Rê · focus · khóa</StateLabel>
            <div className="ds-button-row">
              <div className="ds-forced-state" data-demo-state="hover" inert><Button variant="outlined" className="ds-button ds-outline">Rê chuột</Button></div>
              <div className="ds-forced-state" data-demo-state="focus" inert><Button variant="outlined" className="ds-button ds-outline">Focus bàn phím</Button></div>
              <Button variant="outlined" className="ds-button" disabled>Đang khóa</Button>
            </div>
          </div>
        </Section>

        <Section id="badges" title="Badge trạng thái" description="Chỉ dùng cho trạng thái có ý nghĩa; không dùng làm trang trí.">
          <div className="ds-demo-block">
            <StateLabel>Thường</StateLabel>
            <div className="ds-badge-row">
              <Chip size="small" label="Đang theo dõi" className="ds-badge ds-badge-neutral" />
              <Chip size="small" label="Hoàn tất" className="ds-badge ds-badge-success" />
              <Chip size="small" label="Cần chú ý" className="ds-badge ds-badge-warning" />
              <Chip size="small" label="Lỗi dữ liệu" className="ds-badge ds-badge-error" />
            </div>
          </div>
        </Section>

        <Section id="inputs" title="Ô nhập" description="Cao 40px trên desktop, viền mảnh; focus dùng vòng xanh dễ thấy.">
          <div className="ds-input-grid">
            <div className="ds-demo-block"><StateLabel>Thường</StateLabel><TextField size="small" fullWidth placeholder="Nhập từ khóa nghiên cứu" /></div>
            <div className="ds-demo-block ds-forced-state" data-demo-state="focus" inert><StateLabel>Đang focus</StateLabel><TextField size="small" fullWidth focused defaultValue="Machine learning" /></div>
            <div className="ds-demo-block"><StateLabel>Khóa</StateLabel><TextField size="small" fullWidth disabled defaultValue="Không thể chỉnh sửa" /></div>
            <div className="ds-demo-block"><StateLabel>Lỗi</StateLabel><TextField size="small" fullWidth error defaultValue="" helperText="Nhập nội dung trước khi tiếp tục." /></div>
          </div>
        </Section>

        <Section id="cards" title="Card và dòng danh sách" description="Card trắng trên nền app; hover chỉ đổi nền, không làm chữ đổi màu.">
          <div className="ds-layout-grid">
            <div className="ds-demo-block">
              <StateLabel>Thường</StateLabel>
              <Paper variant="outlined" className="ds-example-card"><Typography component="h3">Project overview</Typography><Typography component="p">Theo dõi số liệu và xu hướng công bố.</Typography></Paper>
            </div>
            <div className="ds-demo-block ds-forced-state" data-demo-state="hover" inert>
              <StateLabel>Rê chuột</StateLabel>
              <Paper variant="outlined" className="ds-example-card ds-example-card-hover"><Typography component="h3">Project overview</Typography><Typography component="p">Nền đổi nhẹ, chữ giữ nguyên.</Typography></Paper>
            </div>
          </div>
          <div className="ds-demo-block ds-list-demo">
            <StateLabel>Dòng danh sách</StateLabel>
            <List component="div" disablePadding className="ds-list">
              <ListItemButton className="ds-list-row"><span>Machine learning in healthcare</span><span>2026</span></ListItemButton>
              <div className="ds-forced-state" data-demo-state="hover" inert><ListItemButton className="ds-list-row ds-list-row-hover"><span>Scientific publication trends</span><span>2025</span></ListItemButton></div>
              <ListItemButton className="ds-list-row" selected><span>Neural information processing</span><span>2024</span></ListItemButton>
              <ListItemButton className="ds-list-row" disabled><span>Disabled list row</span><span>—</span></ListItemButton>
            </List>
          </div>
        </Section>

        <Section id="modal" title="Hộp thoại" description="MUI Dialog, nội dung ngắn và nhóm hành động canh phải.">
          <div className="ds-forced-state" data-demo-state="open" inert>
            <div className="ds-dialog-frame">
              <Dialog open disablePortal hideBackdrop disableScrollLock className="ds-dialog-root" aria-labelledby="ds-dialog-title">
                <DialogTitle id="ds-dialog-title">Lưu thay đổi?</DialogTitle>
                <DialogContent>Thông tin dự án sẽ được cập nhật trong workspace của bạn.</DialogContent>
                <DialogActions>
                  <Button variant="text" className="ds-button ds-ghost">Hủy</Button>
                  <Button variant="contained" className="ds-button ds-primary">Lưu thay đổi</Button>
                </DialogActions>
              </Dialog>
            </div>
          </div>
        </Section>

        <Section id="empty" title="Trạng thái rỗng" description="Không dùng hình minh họa hay icon trong khung rỗng mặc định.">
          <div className="ds-layout-grid">
            <Paper variant="outlined" className="ds-empty-sample"><Typography component="p">Chưa có bài nghiên cứu phù hợp.</Typography></Paper>
            <Paper variant="outlined" className="ds-empty-sample"><Typography component="p">Không có kết quả theo bộ lọc hiện tại. <Button variant="text" className="ds-inline-link">Xóa bộ lọc</Button></Typography></Paper>
          </div>
        </Section>

        <footer className="ds-page-footer">Màu, font và hình khối tuân theo các quyết định HyperDataLab đã chốt.</footer>
      </div>
    </Box>
  )
}
